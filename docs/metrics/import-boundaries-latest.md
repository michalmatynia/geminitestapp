---
owner: 'Platform Team'
last_reviewed: '2026-03-25'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Import Boundaries Check

Generated at: 2026-03-25T08:45:36.094Z

## Summary

- Status: FAILED
- Files scanned: 5745
- Features tracked: 10
- Circular dependencies: 1
- Errors: 1
- Warnings: 0
- Info: 0

## Circular Dependencies

- products -> integrations -> products

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| kangur | ai, cms, document-editor, files, foldertree, integrations | 6 |
| cms | files, foldertree, gsap, products, viewer3d | 5 |
| products | ai, files, foldertree, integrations, internationalization | 5 |
| admin | ai, foldertree, products, prompt-engine | 4 |
| case-resolver | ai, document-editor, filemaker, foldertree | 4 |
| integrations | auth, data-import-export, product-sync, products | 4 |
| ai | files, foldertree, viewer3d | 3 |
| notesapp | document-editor, foldertree | 2 |
| drafter | products | 1 |
| prompt-exploder | foldertree | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| circular-feature-dep | 1 | 0 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | circular-feature-dep | - | Circular dependency between features: products -> integrations -> products |

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
