---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Import Boundaries Check

Generated at: 2026-04-07T16:03:04.474Z

## Summary

- Status: PASSED
- Files scanned: 7104
- Features tracked: 11
- Circular dependencies: 0
- Errors: 0
- Warnings: 0
- Info: 0

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| kangur | ai, auth, cms, files, integrations, playwright | 6 |
| cms | files, gsap, products, viewer3d | 4 |
| products | ai, files, integrations, internationalization | 4 |
| admin | ai, products, prompt-engine | 3 |
| ai | auth, files, viewer3d | 3 |
| integrations | ai, auth, data-import-export | 3 |
| case-resolver | ai, filemaker | 2 |
| database | auth | 1 |
| drafter | products | 1 |
| filemaker | auth | 1 |
| observability | ai | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |

## Issues

No import boundary issues detected.

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
