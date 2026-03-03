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

- **ZenStack version**: 3.4.2
- **Database type**: SQLite (sql.js v1.14.0)
- **Node.js version**: v24.3.0
- **Package manager**: pnpm

## Steps to Reproduce

**Repository**: https://github.com/2234839/zplayground/tree/bug/delegate-self-relation-circular-dependency

A minimal reproduction case is available in the above repository. The schema in `zenstack/schema.zmodel` demonstrates the issue.

### 1. Create a schema with `@@delegate` and self-referential relation

```zmodel
datasource db {
    provider = 'sqlite'
    url = 'file:./dev.db'
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

### Impact

This is a significant limitation that blocks common use cases:
- Social media platforms (posts with comment/reply threads)
- Content management systems (nested categories, pages)
- Organizational tools (employee hierarchies, department trees)
- Forum software (posts with nested replies)
- Any application combining polymorphism with hierarchical data
