# Architecture & Performance Baseline

Generated at: 2026-03-07T10:03:01.659Z

## Snapshot

- Source files: 4818
- Source lines: 782115
- use client files: 1392
- Files >= 1000 LOC: 5
- Files >= 1500 LOC: 1
- Largest file: `src/features/kangur/cms-builder/project.ts` (2855 LOC)
- API routes: 324
- API delegated server routes: 4
- API routes without apiHandler/delegation: 9
- API explicit cache policy coverage: 324/324 (100.0%)
- Cross-feature dependency pairs: 72
- Shared -> features imports: 11
- setInterval occurrences: 22
- Prop-drilling chains (depth >= 3): 4
- Prop-drilling chains (depth >= 4): 0

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 83 |
| `src/app/api/v2/products/[id]/studio/[action]/route.ts` | 40 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/v2/products/[id]/route.ts` | 36 |
| `src/app/api/v2/products/sync/profiles/[id]/route.ts` | 28 |
| `src/app/api/v2/products/categories/[id]/route.ts` | 25 |
| `src/app/api/v2/products/categories/route.ts` | 24 |
| `src/app/api/v2/products/parameters/route.ts` | 24 |
| `src/app/api/auth/users/[id]/route.ts` | 23 |
| `src/app/api/v2/products/sync/profiles/route.ts` | 23 |
| `src/app/api/ai/schema/[entity]/route.ts` | 22 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 22 |
| `src/app/api/v2/products/entities/[type]/[id]/route.ts` | 22 |
| `src/app/api/v2/products/metadata/[type]/[id]/route.ts` | 22 |
| `src/app/api/auth/users/[id]/security/route.ts` | 21 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `cms -> kangur` | 49 |
| `kangur -> cms` | 26 |
| `cms -> gsap` | 19 |
| `case-resolver -> case-resolver-capture` | 18 |
| `case-resolver -> foldertree` | 15 |
| `case-resolver -> filemaker` | 13 |
| `drafter -> products` | 13 |
| `case-resolver -> document-editor` | 12 |
| `jobs -> ai` | 12 |
| `products -> integrations` | 12 |
| `case-resolver -> ai` | 10 |
| `cms -> app-embeds` | 8 |
| `cms -> viewer3d` | 8 |
| `integrations -> products` | 8 |
| `kangur -> foldertree` | 8 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/kangur/cms-builder/project.ts` | 2855 |
| `src/features/kangur/ui/design/primitives.tsx` | 1170 |
| `src/features/cms/components/page-builder/registry/block-definitions-content.ts` | 1138 |
| `src/features/ai/ai-paths/components/__tests__/canvas-connection-preview.test.tsx` | 1055 |
| `src/features/ai/ai-paths/components/__tests__/run-trace-utils.test.ts` | 1003 |
| `src/shared/contracts/ai-paths.ts` | 993 |
| `src/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter.loaders.ts` | 989 |
| `src/shared/contracts/image-studio.ts` | 983 |
| `src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine.test.ts` | 969 |
| `src/features/ai/ai-paths/components/JobQueueContext.tsx` | 968 |
| `src/features/kangur/admin/KangurLessonDocumentEditor.tsx` | 962 |
| `src/features/cms/components/page-builder/registry/block-definitions-media.ts` | 957 |
| `src/features/kangur/ui/components/ClockTrainingGame.tsx` | 957 |
| `src/shared/contracts/ai-paths-core/nodes.ts` | 953 |
| `src/shared/lib/ai-paths/core/utils/__tests__/graph-compile.test.ts` | 929 |
| `src/app/api/image-studio/slots/[slotId]/autoscale/handler.test.ts` | 927 |
| `src/app/api/image-studio/slots/[slotId]/crop/handler.ts` | 923 |
| `src/features/notesapp/context/NoteFormContext.tsx` | 918 |
| `src/features/cms/components/page-builder/PreviewBlock.tsx` | 912 |
| `src/shared/lib/documentation/catalogs/validator-docs.ts` | 909 |
