---
owner: 'Platform Team'
last_reviewed: '2026-03-22'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Import Boundaries Check

Generated at: 2026-03-22T10:14:24.631Z

## Summary

- Status: WARN
- Files scanned: 5669
- Features tracked: 10
- Circular dependencies: 0
- Errors: 0
- Warnings: 12
- Info: 0

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| kangur | ai, cms, document-editor, files, foldertree, integrations | 6 |
| case-resolver | ai, case-resolver-capture, document-editor, filemaker, foldertree | 5 |
| cms | files, foldertree, gsap, products, viewer3d | 5 |
| admin | ai, foldertree, products, prompt-engine | 4 |
| ai | files, foldertree, observability, viewer3d | 4 |
| products | ai, files, foldertree, internationalization | 4 |
| integrations | data-import-export, product-sync, products | 3 |
| notesapp | document-editor, foldertree | 2 |
| drafter | products | 1 |
| prompt-exploder | foldertree | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| deep-relative-import | 0 | 12 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/[...slug]/page.tsx:13 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/[...slug]/page.tsx:14 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/[...slug]/page.tsx:18 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/kangur/(app)/layout.tsx:1 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/kangur/error.tsx:3 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/kangur/layout.tsx:1 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/kangur/login/page.tsx:13 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/preview/[id]/page.tsx:1 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/preview/foldertree-shell-runtime/page.tsx:1 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/products/[id]/page.tsx:5 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/auth/register/page.tsx:1 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/auth/signin/page.tsx:1 | Deep relative import (3 levels up). Consider using path aliases. |

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
