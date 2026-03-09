# Import Boundaries Check

Generated at: 2026-03-09T06:12:23.045Z

## Summary

- Status: FAILED
- Files scanned: 4473
- Features tracked: 9
- Circular dependencies: 0
- Errors: 7
- Warnings: 3
- Info: 0

## Feature Dependency Graph

| Feature | Dependencies | Count |
| --- | --- | ---: |
| cms | admin, ai, foldertree, gsap, products, viewer3d | 6 |
| case-resolver | ai, case-resolver-capture, document-editor, filemaker, foldertree | 5 |
| kangur | ai, cms, document-editor, foldertree | 4 |
| ai | foldertree, products, viewer3d | 3 |
| notesapp | document-editor, foldertree | 2 |
| products | foldertree, internationalization | 2 |
| admin | foldertree | 1 |
| drafter | products | 1 |
| prompt-exploder | foldertree | 1 |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| cross-feature-internal-import | 7 | 0 | 0 |
| deep-relative-import | 0 | 3 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/context/useInspectorAiGeneration.ts:3 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/PageBuilderLayout.tsx:7 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/settings/page-settings/usePageAiAssistant.ts:4 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/components/page-builder/theme/ThemeColorsContext.tsx:5 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/cms/context-registry/page-builder.ts:8 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context-shared. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/ui/context/KangurAiTutorRuntime.shared.ts:47 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| ERROR | cross-feature-internal-import | src/features/kangur/ui/context/KangurContextRegistryPageBoundary.tsx:5 | Imports internal path from feature "ai": @/features/ai/ai-context-registry/context/page-context. Use the barrel export instead. |
| WARN | deep-relative-import | src/app/api/agent/approval-gates/route.ts:3 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/api/agent/capabilities/route.ts:3 | Deep relative import (4 levels up). Consider using path aliases. |
| WARN | deep-relative-import | src/app/api/agent/resources/route.ts:3 | Deep relative import (4 levels up). Consider using path aliases. |

## Notes

- `cross-feature-internal-import` (error): Features should only import from other features via barrel exports (index/public/server/types).
- `deep-relative-import` (warn): 3+ levels of `../` suggest a path alias should be used instead.
- `circular-feature-dep` (error): Circular dependencies between feature domains hinder independent development and testing.
- `prisma-outside-server` (error): Direct Prisma client usage should be restricted to server directories and API routes.
