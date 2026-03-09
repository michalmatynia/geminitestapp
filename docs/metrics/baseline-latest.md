---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-03-09T07:53:05.416Z

## Snapshot

- Source files: 5223
- Source lines: 850220
- use client files: 1496
- Files >= 1000 LOC: 12
- Files >= 1500 LOC: 3
- Largest file: `src/features/kangur/ui/components/KangurAiTutorWidget.tsx` (3075 LOC)
- API routes: 341
- API delegated server routes: 13
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 341/341 (100.0%)
- Cross-feature dependency pairs: 26
- Shared -> features imports: 76
- setInterval occurrences: 22
- Prop-drilling chains (depth >= 3): 25
- Prop-drilling chains (depth >= 4): 0

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/agent/leases/route.ts` | 102 |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 83 |
| `src/app/api/agent/resources/route.ts` | 56 |
| `src/app/api/agent/approval-gates/route.ts` | 40 |
| `src/app/api/v2/products/[id]/studio/[action]/route.ts` | 40 |
| `src/app/api/v2/products/[id]/route.ts` | 38 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/v2/products/metadata/[type]/[id]/route.ts` | 32 |
| `src/app/api/v2/products/metadata/[type]/route.ts` | 27 |
| `src/app/api/v2/products/sync/profiles/[id]/route.ts` | 27 |
| `src/app/api/v2/products/categories/[id]/route.ts` | 25 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 24 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 24 |
| `src/app/api/v2/products/categories/route.ts` | 24 |
| `src/app/api/v2/products/parameters/route.ts` | 24 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `cms -> gsap` | 20 |
| `case-resolver -> case-resolver-capture` | 18 |
| `case-resolver -> foldertree` | 15 |
| `case-resolver -> filemaker` | 13 |
| `drafter -> products` | 13 |
| `case-resolver -> document-editor` | 12 |
| `kangur -> foldertree` | 10 |
| `case-resolver -> ai` | 9 |
| `ai -> products` | 8 |
| `cms -> viewer3d` | 8 |
| `kangur -> cms` | 8 |
| `products -> internationalization` | 8 |
| `products -> foldertree` | 7 |
| `prompt-exploder -> foldertree` | 7 |
| `admin -> foldertree` | 5 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/kangur/ui/components/KangurAiTutorWidget.tsx` | 3075 |
| `src/features/kangur/cms-builder/project.ts` | 2855 |
| `src/features/kangur/ui/components/KangurAiTutorWidget.test.tsx` | 2191 |
| `src/features/kangur/ui/design/primitives.tsx` | 1480 |
| `src/features/kangur/ui/context/KangurAiTutorContext.test.tsx` | 1424 |
| `src/features/kangur/ui/context/KangurAiTutorRuntime.shared.ts` | 1348 |
| `src/features/cms/components/page-builder/registry/block-definitions-content.ts` | 1140 |
| `src/shared/contracts/image-studio.ts` | 1121 |
| `src/features/ai/ai-paths/components/__tests__/canvas-connection-preview.test.tsx` | 1055 |
| `src/features/kangur/admin/KangurLessonDocumentEditor.tsx` | 1045 |
| `src/features/kangur/ui/components/ClockTrainingGame.tsx` | 1007 |
| `src/shared/contracts/ai-paths.ts` | 1005 |
| `src/features/ai/ai-paths/components/__tests__/run-trace-utils.test.ts` | 999 |
| `src/features/kangur/server/context-registry.ts` | 999 |
| `src/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter.loaders.ts` | 989 |
| `src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine.test.ts` | 969 |
| `src/features/cms/components/page-builder/registry/block-definitions-media.ts` | 957 |
| `src/shared/contracts/ai-paths-core/nodes.ts` | 953 |
| `src/features/ai/image-studio/components/VersionNodeMapCanvas.tsx` | 945 |
| `src/features/kangur/admin/AdminKangurSettingsPage.tsx` | 935 |
