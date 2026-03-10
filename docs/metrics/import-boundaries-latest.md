---
owner: 'Platform Team'
last_reviewed: '2026-03-10'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Import Boundaries Check

Generated at: 2026-03-10T21:35:15.201Z

## Summary

- Status: PASSED
- Files scanned: 4612
- Features tracked: 9
- Circular dependencies: 0
- Errors: 0
- Warnings: 0
- Info: 0

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| case-resolver | ai, case-resolver-capture, document-editor, filemaker, foldertree | 5 |
| cms | admin, foldertree, gsap, products, viewer3d | 5 |
| ai | foldertree, observability, products, viewer3d | 4 |
| kangur | ai, cms, document-editor, foldertree | 4 |
| notesapp | document-editor, foldertree | 2 |
| products | foldertree, internationalization | 2 |
| admin | foldertree | 1 |
| drafter | products | 1 |
| prompt-exploder | foldertree | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |

## Issues

No import boundary issues detected.

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
- `prisma-outside-server` (error): Direct Prisma client usage should be restricted to server directories and API routes.
