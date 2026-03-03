# Submitting the Bug Report to ZenStack

## Repository URL
https://github.com/2234839/zplayground/tree/bug/delegate-self-relation-circular-dependency

## Step-by-Step Guide

### 1. Open GitHub Issue
Go to: https://github.com/zenstackhq/zenstack/issues/new

### 2. Fill in the Issue Details

**Title:**
```
Cyclic dependency error with self-referential relations in @@delegate models
```

**Description:**
Copy the entire content from `BUG_REPORT.md` in this branch.

**Labels to add:**
- `bug`
- `enhancement: polymorphism`
- `area: schema`

### 3. Add Reference to Reproduction

In the issue description, add this link to the reproduction branch:
```
Reproduction: https://github.com/2234839/zplayground/tree/bug/delegate-self-relation-circular-dependency
```

### 4. Optional: Add Code Snippet

Add this code block at the beginning of the issue for quick reference:

```zmodel
model Content {
    id   Int         @id @default(autoincrement())
    type ContentType
    @@delegate(type)
}

model Post extends Content {
    replies  Post[]  @relation("PostReplies")
    parentId Int?
    parent   Post?   @relation("PostReplies", fields: [parentId], references: [id])
}
```

## Quick Template

Here's a ready-to-use issue template:

---

**Title:** Cyclic dependency error with self-referential relations in @@delegate models

**Body:**

## Description
Models using `@@delegate` inheritance cannot have self-referential relations (e.g., parent-child, reply chains). This throws a "Cyclic dependency" error during topological sort.

## Expected Behavior
Should work like regular models that support self-referential relations fine.

## Minimal Reproduction
```zmodel
model Content {
    id   Int         @id @default(autoincrement())
    type ContentType
    @@delegate(type)
}

model Post extends Content {
    replies  Post[]  @relation("PostReplies")
    parentId Int?
    parent   Post?   @relation("PostReplies", fields: [parentId], references: [id])
}
```

Run: `npx zenstack generate`

## Error
```
Error: Cyclic dependency, node was:{"name":"Post","baseModel":"Content",...}
    at visit (/node_modules/.pnpm/toposort@2.0.2/node_modules/toposort/index.js:45:13)
```

## Environment
- ZenStack: Latest (2026-03-03)
- Node.js: v18+
- Database: SQLite (all)

## Reproduction Link
https://github.com/2234839/zplayground/tree/bug/delegate-self-relation-circular-dependency

---

## After Submission

1. **Bookmark the issue** for tracking
2. **Share the issue link** in this repo's README if you want to track it
3. **Monitor for responses** from ZenStack maintainers

## Workaround While Waiting

If you need this feature now, move the relation to the base class:

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
    // Post-specific fields
}
```

**Note:** This makes the relation available to ALL content types.
