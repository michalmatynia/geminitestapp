---
owner: 'Platform Team'
last_reviewed: '2026-03-27'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Import Boundaries Check

Generated at: 2026-03-27T02:24:38.712Z

## Summary

- Status: WARN
- Files scanned: 5889
- Features tracked: 10
- Circular dependencies: 0
- Errors: 0
- Warnings: 1
- Info: 0

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| kangur | ai, cms, document-editor, files, foldertree, integrations | 6 |
| cms | files, foldertree, gsap, products, viewer3d | 5 |
| products | ai, files, foldertree, integrations, internationalization | 5 |
| admin | ai, foldertree, products, prompt-engine | 4 |
| case-resolver | ai, document-editor, filemaker, foldertree | 4 |
| ai | files, foldertree, viewer3d | 3 |
| integrations | auth, data-import-export | 2 |
| notesapp | document-editor, foldertree | 2 |
| drafter | products | 1 |
| prompt-exploder | foldertree | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| deep-relative-import | 0 | 1 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | deep-relative-import | src/app/(frontend)/kangur/(app)/[[...slug]]/page.tsx:9 | Deep relative import (3 levels up). Consider using path aliases. |

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
