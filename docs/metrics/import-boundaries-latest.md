---
owner: 'Platform Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Import Boundaries Check

Generated at: 2026-04-11T14:55:42.768Z

## Summary

- Status: PASSED
- Files scanned: 7265
- Features tracked: 11
- Circular dependencies: 0
- Errors: 0
- Warnings: 0
- Info: 0

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| kangur | ai, auth, cms, files, integrations, playwright | 6 |
| products | ai, files, integrations, internationalization, playwright | 5 |
| cms | files, gsap, products, viewer3d | 4 |
| admin | ai, products, prompt-engine | 3 |
| ai | auth, files, viewer3d | 3 |
| integrations | auth, data-import-export, playwright | 3 |
| case-resolver | ai, filemaker | 2 |
| database | ai, auth | 2 |
| drafter | products | 1 |
| filemaker | auth | 1 |
| playwright | ai | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |

## Issues

No import boundary issues detected.

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
