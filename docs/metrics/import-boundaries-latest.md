---
owner: 'Platform Team'
last_reviewed: '2026-03-23'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Import Boundaries Check

Generated at: 2026-03-23T16:32:16.312Z

## Summary

- Status: PASSED
- Files scanned: 5707
- Features tracked: 10
- Circular dependencies: 0
- Errors: 0
- Warnings: 0
- Info: 0

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| kangur | ai, cms, document-editor, files, foldertree, integrations | 6 |
| cms | files, foldertree, gsap, products, viewer3d | 5 |
| products | ai, files, foldertree, integrations, internationalization | 5 |
| admin | ai, foldertree, products, prompt-engine | 4 |
| ai | files, foldertree, observability, viewer3d | 4 |
| case-resolver | ai, document-editor, filemaker, foldertree | 4 |
| integrations | data-import-export, product-sync | 2 |
| notesapp | document-editor, foldertree | 2 |
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
