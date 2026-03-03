# Bug Report: Cyclic Dependency with Self-Referential Relations in Delegate Models

## Description and expected behavior

**Bug**: When using `@@delegate` inheritance with self-referential relations, Zenstack throws a `Cyclic dependency` error during the topological sort phase. This prevents models that extend a base class with `@@delegate` from having self-referencing relationships.

**Expected Behavior**: Models using `@@delegate` inheritance should support self-referential relations (e.g., parent-child, reply chains) just like regular models do. The schema should compile successfully without circular dependency errors.

Self-referential relations are a common and essential pattern in database modeling for:
- Comment/reply threads
- Organizational hierarchies
- Category trees
- Social media features (posts with replies)

## Environment (please complete the following information)

- **ZenStack version**: Latest (as of 2026-03-03)
- **Database type**: SQLite (reproduces with PostgreSQL, MySQL, etc.)
- **Node.js version**: v18+
- **Package manager**: pnpm

## Steps to Reproduce

### 1. Create a schema with `@@delegate` and self-referential relation

```zmodel
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

### 2. Run generation

```bash
npx zenstack generate
# or
pnpm dev
```

## Actual Behavior

The application crashes with the following error:

```
Error: Cyclic dependency, node was:{"name":"Post","baseModel":"Content","fields":{...}}
    at visit (/node_modules/.pnpm/toposort@2.0.2/node_modules/toposort/index.js:45:13)
```

The error occurs during the topological sort phase when Zenstack tries to resolve model dependencies.

## Additional context

### Self-Referential Relations Work Without `@@delegate`

Regular models without `@@delegate` support self-referential relations without issues. This is tested and working:

```zmodel
// This works fine - from Zenstack's own test suite
model User {
    id        Int     @id @default(autoincrement())
    teacherId Int?
    teacher   User?   @relation("TeacherStudents", fields: [teacherId], references: [id])
    students  User[]  @relation("TeacherStudents")
}
```

**Reference**: [tests/integration/tests/enhancements/with-policy/self-relation.test.ts](https://github.com/zenstackhq/zenstack/blob/master/tests/integration/tests/enhancements/with-policy/self-relation.test.ts)

### Root Cause Analysis

The issue appears to be in how Zenstack builds the dependency graph for topological sorting. When a model uses `@@delegate` inheritance AND has a self-referential relation, the dependency resolver treats the self-reference as a cross-model dependency, creating a cycle:

```
Post → (extends) → Content
Post → (relation) → Post (self-reference detected as cycle)
```

The topological sort algorithm detects this as a cycle and fails, even though self-referential relations are valid and should be handled specially (similar to how they work for regular models).

### Workarounds (with limitations)

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
**Limitation**: This forces ALL content types to have the reply relationship, which may not be desired architecturally.

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
**Limitation**: Loses the polymorphism benefits of `@@delegate` (the entire point of using it).

### Suggested Fix

The dependency resolver should:
1. Detect self-referential relations (where the relation target is the same model)
2. Exclude them from cross-model dependency analysis
3. Only apply topological sort dependencies to relations between **different** models

This would allow `@@delegate` models to have self-referential relations without triggering the cyclic dependency error, matching the behavior of regular models.

### Impact

This is a significant limitation that blocks common use cases:
- Social media platforms (posts with comment/reply threads)
- Content management systems (nested categories, pages)
- Organizational tools (employee hierarchies, department trees)
- Forum software (posts with nested replies)
- Any application combining polymorphism with hierarchical data

### Reproduction Repository

A minimal reproduction case with working code is available at:
**https://github.com/2234839/zplayground/tree/bug/delegate-self-relation-circular-dependency**

The schema in `zenstack/schema.zmodel` demonstrates the issue. Simply run `npx zenstack generate` to reproduce the error.
