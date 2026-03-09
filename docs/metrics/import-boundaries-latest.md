---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Import Boundaries Check

Generated at: 2026-03-09T09:07:29.483Z

## Summary

- Status: FAILED
- Files scanned: 4494
- Features tracked: 10
- Circular dependencies: 2
- Errors: 29
- Warnings: 0
- Info: 0

## Circular Dependencies

- ai -> products -> ai
- ai -> observability -> ai

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| cms | admin, ai, foldertree, gsap, products, viewer3d | 6 |
| case-resolver | ai, case-resolver-capture, document-editor, filemaker, foldertree | 5 |
| ai | foldertree, observability, products, viewer3d | 4 |
| kangur | ai, cms, document-editor, foldertree | 4 |
| products | ai, foldertree, internationalization | 3 |
| notesapp | document-editor, foldertree | 2 |
| admin | foldertree | 1 |
| drafter | products | 1 |
| observability | ai | 1 |
| prompt-exploder | foldertree | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| cross-feature-internal-import | 27 | 0 | 0 |
| circular-feature-dep | 2 | 0 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | circular-feature-dep | - | Circular dependency between features: ai -> products -> ai |
| ERROR | circular-feature-dep | - | Circular dependency between features: ai -> observability -> ai |
| ERROR | cross-feature-internal-import | src/features/ai/insights/generator.ts:8 | Imports internal path from feature "observability": @/features/observability/context-registry/system-prompt. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/context/useInspectorAiGeneration.ts:3 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/PageBuilderLayout.tsx:7 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/settings/page-settings/usePageAiAssistant.ts:4 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/theme/ThemeColorsContext.tsx:5 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/context-registry/page-builder.ts:8 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context-shared. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/admin/AdminKangurLessonsManagerPage.tsx:6 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/admin/context-registry/lessons-manager.ts:1 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context-shared. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/admin/KangurLessonNarrationPanel.tsx:6 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/admin/KangurLessonNarrationPanel.tsx:10 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context-shared. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/tts/context-registry/server.ts:1 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context-shared. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/tts/context-registry/server.ts:5 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/server. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/ui/components/KangurLessonNarrator.tsx:6 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/ui/components/KangurLessonNarrator.tsx:10 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context-shared. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/ui/context/KangurAiTutorRuntime.shared.ts:47 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/ui/context/KangurContextRegistryPageBoundary.tsx:5 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/observability/context-registry/server.ts:1 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context-shared. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/observability/context-registry/server.ts:5 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/server. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/observability/context-registry/workspace.ts:1 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context-shared. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/observability/hooks/useLogMutations.ts:3 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/observability/pages/SystemLogsPage.tsx:6 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/form/ProductFormStudio.tsx:5 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/components/ProductForm.tsx:6 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/context-registry/workspace.ts:1 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context-shared. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/context/ProductStudioContext.tsx:5 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/hooks/useProductStudioMutations.ts:3 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/workers/product-ai-processors.ts:9 | Imports internal path from feature "ai": @/features/ai/ai-paths/context-registry/system-prompt. Use the barrel export instead. |

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
- `prisma-outside-server` (error): Direct Prisma client usage should be restricted to server directories and API routes.
