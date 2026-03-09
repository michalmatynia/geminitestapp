---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Import Boundaries Check

Generated at: 2026-03-08T10:35:09.184Z

## Summary

- Status: WARN
- Files scanned: 4311
- Features tracked: 15
- Circular dependencies: 0
- Errors: 0
- Warnings: 42
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
| deep-relative-import | 0 | 42 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| WARN | deep-relative-import | src/app/api/ai-paths/playwright/[runId]/artifacts/[file]/handler.ts:14 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/ai-paths/components/ai-paths-settings/hooks/persistence/usePathPersistence.ts:15 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/ai-paths/components/ai-paths-settings/panels/AiPathsRuntimeLog.tsx:4 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/ai-paths/components/ai-paths-settings/runtime/server-execution/useServerRunStream.ts:15 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/ai-paths/components/ai-paths-settings/sections/AiPathsCanvasView.tsx:23 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/ai-paths/components/node-config/dialog/NodeHistoryTab.tsx:11 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/analysis/sections/AiPathAnalysisTriggerSectionImpl.tsx:9 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx:11 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx:12 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx:13 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvas.tsx:14 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/center-preview/sections/CenterPreviewCanvasContext.tsx:7 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/center-preview/sections/CenterPreviewHeader.tsx:7 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/generation-toolbar/handlers/useAnalysisHandlers.ts:5 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/ai/image-studio/components/generation-toolbar/handlers/useCenterAndScaleHandlers.ts:13 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/hooks/page-builder/page-builder-reducer/block-actions.ts:7 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/hooks/page-builder/page-builder-reducer/complex-actions.ts:14 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/hooks/page-builder/page-builder-reducer/grid-actions.ts:2 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/hooks/page-builder/page-builder-reducer/page-actions.ts:2 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/hooks/page-builder/page-builder-reducer/section-actions.ts:10 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/features/cms/hooks/page-builder/page-builder-reducer/section-actions.ts:14 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/integration-database-handler.ts:22 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/integration-database-template-context.ts:14 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/integration-schema-handler.ts:12 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/bounds-normalizer-handler.ts:10 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/canvas-output-handler.ts:7 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/context.ts:6 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/iterator.ts:6 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/mapper.ts:6 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/mutator.ts:7 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/parser.ts:6 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/regex.ts:7 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/handlers/transform/validator.ts:17 | Deep relative import (3 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/core/runtime/node-code-object-v3-legacy-bridge.ts:1 | Deep relative import (6 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/ai-paths/portable-engine/node-code-objects-v2-contracts.ts:1 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/documentation/catalogs/ai-paths.ts:6 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/documentation/catalogs/kangur.ts:6 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/documentation/catalogs/prompt-exploder.ts:6 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/documentation/catalogs/validator-semantic-grammar.ts:1 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/documentation/catalogs/validator-semantic-grammar.ts:2 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/documentation/catalogs/validator-semantic-grammar.ts:3 | Deep relative import (5 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/shared/lib/documentation/catalogs/validator-semantic-grammar.ts:4 | Deep relative import (5 levels up). Consider using path aliases. |

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
- `prisma-outside-server` (error): Direct Prisma client usage should be restricted to server directories and API routes.
