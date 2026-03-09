---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Import Boundaries Check

Generated at: 2026-03-09T07:50:50.862Z

## Summary

- Status: FAILED
- Files scanned: 4483
- Features tracked: 9
- Circular dependencies: 1
- Errors: 9
- Warnings: 0
- Info: 0

## Circular Dependencies

- ai -> products -> ai

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| cms | admin, ai, foldertree, gsap, products, viewer3d | 6 |
| case-resolver | ai, case-resolver-capture, document-editor, filemaker, foldertree | 5 |
| kangur | ai, cms, document-editor, foldertree | 4 |
| ai | foldertree, products, viewer3d | 3 |
| products | ai, foldertree, internationalization | 3 |
| notesapp | document-editor, foldertree | 2 |
| admin | foldertree | 1 |
| drafter | products | 1 |
| prompt-exploder | foldertree | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| cross-feature-internal-import | 8 | 0 | 0 |
| circular-feature-dep | 1 | 0 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | circular-feature-dep | - | Circular dependency between features: ai -> products -> ai |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/context/useInspectorAiGeneration.ts:3 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/PageBuilderLayout.tsx:7 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/settings/page-settings/usePageAiAssistant.ts:4 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/theme/ThemeColorsContext.tsx:5 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/context-registry/page-builder.ts:8 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context-shared. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/ui/context/KangurAiTutorRuntime.shared.ts:47 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/ui/context/KangurContextRegistryPageBoundary.tsx:5 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/products/workers/product-ai-processors.ts:9 | Imports internal path from feature "ai": @/features/ai/ai-paths/context-registry/system-prompt. Use the barrel export instead. |

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
- `prisma-outside-server` (error): Direct Prisma client usage should be restricted to server directories and API routes.
