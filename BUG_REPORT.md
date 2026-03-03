# Bug Report: Cyclic Dependency with Self-Referential Relations in Delegate Models

## Summary

When using `@@delegate` inheritance with self-referential relations, Zenstack throws a `Cyclic dependency` error during the topological sort phase. This prevents models that extend a base class with `@@delegate` from having self-referencing relationships (e.g., parent-child, reply chains).

## Environment

- **Zenstack Version**: Latest (as of 2026-03-03)
- **Node.js Version**: v18+
- **Database**: SQLite (reproduces with other providers too)

## Steps to Reproduce

### 1. Create a schema with `@@delegate` and self-referential relation

```zmodel
// zenstack/schema.zmodel

datasource db {
    provider = 'sqlite'
    url = 'file:./dev.db'
}

generator client {
    provider = 'prisma-client-js'
}

enum ContentType {
    POST
    ARTICLE
    QUESTION
}

model Content {
    id   Int         @id @default(autoincrement())
    type ContentType
    @@delegate(type)
}

model Post extends Content {
    post1s   Post1[]
    replies  Post[]  @relation("PostReplies")
    parentId Int?
    parent   Post?   @relation("PostReplies", fields: [parentId], references: [id])
}

model Post1 extends Content {
    post   Post @relation(fields: [postId], references: [id])
    postId Int
}
```

### 2. Run the application

```bash
pnpm dev
# or
npx zenstack generate
```

## Actual Behavior

The application crashes with the following error:

```
Error: Cyclic dependency, node was:{"name":"Post","baseModel":"Content",...}
    at visit (/home/gs/opensource_code/zplayground/node_modules/.pnpm/toposort@2.0.2/node_modules/toposort/index.js:45:13)
```

The error occurs during the topological sort phase when Zenstack tries to resolve model dependencies.

## Expected Behavior

The schema should compile successfully, and the `Post` model should support self-referential relationships (parent/reply) just like regular models do.

Self-referential relations are a common pattern in database modeling (e.g., comment threads, organizational hierarchies, category trees). The combination of `@@delegate` inheritance and self-referential relations should be supported.

## Additional Context

### Self-Referential Relations Work Without `@@delegate`

Regular models without `@@delegate` support self-referential relations without issues:

```zmodel
// This works fine
model User {
    id        Int     @id @default(autoincrement())
    teacherId Int?
    teacher   User?   @relation("TeacherStudents", fields: [teacherId], references: [id])
    students  User[]  @relation("TeacherStudents")
}
```

Reference: [Zenstack test file - self-relation.test.ts](https://github.com/zenstackhq/zenstack/blob/master/tests/integration/tests/enhancements/with-policy/self-relation.test.ts)

### Workarounds

There are a few workarounds, but each has limitations:

#### Option 1: Move the relation to the base class
```zmodel
model Content {
    id       Int         @id @default(autoincrement())
    type     ContentType
    replies  Content[]   @relation("ContentReplies")
    parentId Int?
    parent   Content?    @relation("ContentReplies", fields: [parentId], references: [id])
    @@delegate(type)
}

model Post extends Content {
    post1s Post1[]
}
```

**Limitation**: This forces ALL content types to have the reply relationship, which may not be desired.

#### Option 2: Remove inheritance
```zmodel
model Post {
    id       Int         @id @default(autoincrement())
    type     ContentType
    replies  Post[]
    parentId Int?
    parent   Post?       @relation("PostReplies", fields: [parentId], references: [id])
    post1s   Post1[]
}
```

**Limitation**: Loses the polymorphism benefits of `@@delegate`.

## Root Cause Analysis

The issue appears to be in how Zenstack builds the dependency graph for topological sorting. When a model uses `@@delegate` inheritance AND has a self-referential relation, the dependency resolver treats the self-reference as a cross-model dependency, creating a cycle:

```
Post → (extends) → Content
Post → (relation) → Post (self-reference)
```

The topological sort algorithm detects this as a cycle and fails, even though self-referential relations are valid and should be handled specially (similar to how they work for regular models).

## Suggested Fix

The dependency resolver should:
1. Detect self-referential relations (where the relation target is the same model)
2. Exclude them from cross-model dependency analysis
3. Only apply topological sort dependencies to relations between different models

This would allow `@@delegate` models to have self-referential relations without triggering the cyclic dependency error.

## Impact

This is a significant limitation for applications that need:
- Polymorphic content models (using `@@delegate`)
- Hierarchical or recursive relationships (comments, replies, categories, etc.)
- Common patterns like social media features (posts with replies), organizational charts, nested categories

## References

- Similar pattern documented in ZenStack Multi-Tenancy guide shows `Tenant` with self-referential `parent`/`children`, but without `@@delegate`
- Self-relation tests work fine for regular models: [tests/integration/tests/enhancements/with-policy/self-relation.test.ts](https://github.com/zenstackhq/zenstack/blob/master/tests/integration/tests/enhancements/with-policy/self-relation.test.ts)

## Test Case

A minimal reproduction case is provided in this branch in `zenstack/schema.zmodel`. Simply run `pnpm dev` or `npx zenstack generate` to reproduce the error.
