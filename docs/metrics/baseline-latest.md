---
owner: 'Platform Team'
last_reviewed: '2026-03-10'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-03-10T12:37:17.417Z

## Snapshot

- Source files: 5411
- Source lines: 907629
- use client files: 1514
- Files >= 1000 LOC: 22
- Files >= 1500 LOC: 8
- Largest file: `src/features/kangur/ui/components/KangurAiTutorWidget.test.tsx` (5460 LOC)
- API routes: 347
- API delegated server routes: 13
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 347/347 (100.0%)
- Cross-feature dependency pairs: 25
- Shared -> features imports: 76
- setInterval occurrences: 23
- Prop-drilling chains (depth >= 3): 9
- Prop-drilling chains (depth >= 4): 0

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/agent/leases/route.ts` | 103 |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 83 |
| `src/app/api/agent/resources/route.ts` | 57 |
| `src/app/api/agent/approval-gates/route.ts` | 41 |
| `src/app/api/v2/products/[id]/studio/[action]/route.ts` | 40 |
| `src/app/api/v2/products/[id]/route.ts` | 38 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/v2/products/metadata/[type]/[id]/route.ts` | 32 |
| `src/app/api/v2/products/metadata/[type]/route.ts` | 27 |
| `src/app/api/v2/products/sync/profiles/[id]/route.ts` | 27 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 25 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 25 |
| `src/app/api/v2/products/categories/[id]/route.ts` | 25 |
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
| `src/features/kangur/ui/components/KangurAiTutorWidget.test.tsx` | 5460 |
| `src/features/kangur/ui/components/KangurAiTutorWidget.tsx` | 4984 |
| `src/features/kangur/cms-builder/project.ts` | 2855 |
| `src/features/kangur/ui/context/KangurAiTutorContext.test.tsx` | 1732 |
| `src/features/kangur/ui/services/progress.ts` | 1706 |
| `src/features/kangur/ui/context/KangurAiTutorRuntime.shared.ts` | 1583 |
| `src/features/kangur/ui/components/ClockTrainingGame.tsx` | 1536 |
| `src/features/kangur/admin/KangurLessonDocumentEditor.tsx` | 1500 |
| `src/features/kangur/ui/design/primitives.tsx` | 1480 |
| `src/features/kangur/server/ai-tutor-adaptive.ts` | 1362 |
| `src/features/kangur/admin/KangurQuestionsManagerPanel.tsx` | 1346 |
| `src/features/kangur/ui/KangurLoginPage.test.tsx` | 1145 |
| `src/features/cms/components/page-builder/registry/block-definitions-content.ts` | 1141 |
| `src/features/kangur/ui/KangurLoginPage.tsx` | 1120 |
| `src/shared/contracts/image-studio.ts` | 1120 |
| `src/app/api/kangur/ai-tutor/chat/handler.test.ts` | 1077 |
| `src/features/ai/ai-paths/components/__tests__/canvas-connection-preview.test.tsx` | 1055 |
| `src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine.test.ts` | 1035 |
| `src/features/kangur/observability/summary.ts` | 1024 |
| `src/features/kangur/server/context-registry.ts` | 1015 |
