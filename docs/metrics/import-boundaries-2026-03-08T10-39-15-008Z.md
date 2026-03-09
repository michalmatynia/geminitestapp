---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Import Boundaries Check

Generated at: 2026-03-08T10:39:15.008Z

## Summary

- Status: WARN
- Files scanned: 4311
- Features tracked: 15
- Circular dependencies: 0
- Errors: 0
- Warnings: 2
- Info: 0

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| ai | auth, files, foldertree, notesapp, playwright, products, prompt-engine, prompt-exploder, tooltip-engine, viewer3d | 10 |
| case-resolver | admin, ai, auth, case-resolver-capture, document-editor, filemaker, foldertree, prompt-exploder | 8 |
| cms | admin, app-embeds, files, foldertree, gsap, products, viewer3d | 7 |
| jobs | ai, case-resolver, integrations, product-sync, products | 5 |
| kangur | auth, cms, document-editor, foldertree, tooltip-engine | 5 |
| admin | auth, foldertree, notesapp, prompt-engine | 4 |
| products | files, foldertree, internationalization, tooltip-engine | 4 |
| data-import-export | integrations, products | 2 |
| integrations | playwright, products | 2 |
| notesapp | document-editor, foldertree | 2 |
| prompt-exploder | foldertree, tooltip-engine | 2 |
| case-resolver-capture | filemaker | 1 |
| drafter | products | 1 |
| files | viewer3d | 1 |
| product-sync | integrations | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| deep-relative-import | 0 | 2 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | deep-relative-import | src/features/ai/ai-paths/components/node-config/dialog/NodeHistoryTab.tsx:11 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/analysis/sections/AiPathAnalysisTriggerSectionImpl.tsx:9 | Deep relative import (3 levels up). Consider using path aliases. |

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
- `prisma-outside-server` (error): Direct Prisma client usage should be restricted to server directories and API routes.
