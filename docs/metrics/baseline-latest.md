# Architecture & Performance Baseline

Generated at: 2026-03-08T14:48:24.640Z

## Snapshot

- Source files: 5084
- Source lines: 827589
- use client files: 1479
- Files >= 1000 LOC: 10
- Files >= 1500 LOC: 3
- Largest file: `src/features/kangur/cms-builder/project.ts` (2855 LOC)
- API routes: 330
- API delegated server routes: 0
- API routes without apiHandler/delegation: 13
- API explicit cache policy coverage: 330/330 (100.0%)
- Cross-feature dependency pairs: 56
- Shared -> features imports: 75
- setInterval occurrences: 22
- Prop-drilling chains (depth >= 3): 22
- Prop-drilling chains (depth >= 4): 0

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 83 |
| `src/app/api/v2/products/[id]/studio/[action]/route.ts` | 40 |
| `src/app/api/v2/products/[id]/route.ts` | 38 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/v2/products/metadata/[type]/[id]/route.ts` | 32 |
| `src/app/api/v2/products/metadata/[type]/route.ts` | 27 |
| `src/app/api/v2/products/sync/profiles/[id]/route.ts` | 27 |
| `src/app/api/v2/products/categories/[id]/route.ts` | 25 |
| `src/app/api/v2/products/categories/route.ts` | 24 |
| `src/app/api/v2/products/parameters/route.ts` | 24 |
| `src/app/api/auth/users/[id]/route.ts` | 23 |
| `src/app/api/v2/products/tags/route.ts` | 23 |
| `src/app/api/ai/schema/[entity]/route.ts` | 22 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 22 |
| `src/app/api/v2/products/ai-jobs/route.ts` | 22 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `cms -> gsap` | 20 |
| `case-resolver -> case-resolver-capture` | 18 |
| `case-resolver -> foldertree` | 15 |
| `case-resolver -> filemaker` | 13 |
| `drafter -> products` | 13 |
| `case-resolver -> document-editor` | 12 |
| `jobs -> ai` | 12 |
| `kangur -> foldertree` | 10 |
| `case-resolver -> ai` | 9 |
| `ai -> products` | 8 |
| `cms -> app-embeds` | 8 |
| `cms -> viewer3d` | 8 |
| `integrations -> products` | 8 |
| `kangur -> cms` | 8 |
| `products -> internationalization` | 8 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/kangur/cms-builder/project.ts` | 2855 |
| `src/features/kangur/ui/components/KangurAiTutorWidget.tsx` | 2039 |
| `src/features/kangur/ui/components/KangurAiTutorWidget.test.tsx` | 1501 |
| `src/features/kangur/ui/design/primitives.tsx` | 1480 |
| `src/features/cms/components/page-builder/registry/block-definitions-content.ts` | 1140 |
| `src/features/kangur/ui/context/KangurAiTutorContext.test.tsx` | 1097 |
| `src/features/ai/ai-paths/components/JobQueueContext.tsx` | 1069 |
| `src/features/ai/ai-paths/components/__tests__/canvas-connection-preview.test.tsx` | 1055 |
| `src/features/kangur/admin/KangurLessonDocumentEditor.tsx` | 1045 |
| `src/features/ai/ai-paths/components/__tests__/run-trace-utils.test.ts` | 1003 |
| `src/shared/contracts/image-studio.ts` | 999 |
| `src/shared/contracts/ai-paths.ts` | 995 |
| `src/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter.loaders.ts` | 989 |
| `src/features/kangur/ui/components/ClockTrainingGame.tsx` | 969 |
| `src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine.test.ts` | 969 |
| `src/features/kangur/ui/context/KangurAiTutorRuntime.shared.ts` | 967 |
| `src/features/cms/components/page-builder/registry/block-definitions-media.ts` | 957 |
| `src/shared/lib/ai-brain/context/BrainContext.tsx` | 957 |
| `src/shared/contracts/ai-paths-core/nodes.ts` | 953 |
| `src/features/ai/image-studio/components/VersionNodeMapCanvas.tsx` | 945 |
