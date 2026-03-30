---
owner: 'Platform Team'
last_reviewed: '2026-03-30'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Import Boundaries Check

Generated at: 2026-03-30T12:40:58.799Z

## Summary

- Status: WARN
- Files scanned: 6401
- Features tracked: 13
- Circular dependencies: 0
- Errors: 0
- Warnings: 11
- Info: 0

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| kangur | ai, auth, cms, document-editor, files, foldertree, integrations | 7 |
| cms | files, foldertree, gsap, products, viewer3d | 5 |
| products | ai, files, foldertree, integrations, internationalization | 5 |
| admin | ai, foldertree, products, prompt-engine | 4 |
| ai | auth, files, foldertree, viewer3d | 4 |
| case-resolver | ai, document-editor, filemaker, foldertree | 4 |
| filemaker | auth, document-editor, foldertree | 3 |
| integrations | auth, data-import-export | 2 |
| notesapp | document-editor, foldertree | 2 |
| database | auth | 1 |
| drafter | products | 1 |
| observability | ai | 1 |
| prompt-exploder | foldertree | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| deep-relative-import | 0 | 11 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/[...slug]/loading.tsx:1 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/kangur/(app)/duels/page.tsx:1 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/kangur/(app)/lessons/page.tsx:1 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/kangur/(app)/page.tsx:1 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/kangur/(app)/tests/page.tsx:1 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/kangur/loading.tsx:1 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/login/loading.tsx:1 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/preview/[id]/loading.tsx:1 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/preview/foldertree-shell-runtime/loading.tsx:1 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/[locale]/(frontend)/products/[id]/loading.tsx:1 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/parameter-inference/parameter-inference.merger.ts:11 | Deep relative import (3 levels up). Consider using path aliases. |

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
