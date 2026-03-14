---
owner: 'Platform Team'
last_reviewed: '2026-03-14'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-03-14T15:20:23.501Z

## Snapshot

- Source files: 6011
- Source lines: 984899
- use client files: 1452
- Files >= 1000 LOC: 27
- Files >= 1500 LOC: 2
- Largest file: `src/features/kangur/server/knowledge-graph/retrieval.ts` (1649 LOC)
- API routes: 350
- API delegated server routes: 12
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 350/350 (100.0%)
- Cross-feature dependency pairs: 24
- Shared -> features imports: 72
- setInterval occurrences: 24
- Prop-drilling chains (depth >= 3): 64
- Prop-drilling chains (depth >= 4): 21

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/agent/leases/route.ts` | 119 |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 83 |
| `src/app/api/agent/resources/route.ts` | 59 |
| `src/app/api/agent/approval-gates/route.ts` | 50 |
| `src/app/api/v2/products/[id]/route.ts` | 42 |
| `src/app/api/v2/products/[id]/studio/[action]/route.ts` | 40 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/v2/products/metadata/[type]/[id]/route.ts` | 35 |
| `src/app/api/v2/products/metadata/[type]/route.ts` | 32 |
| `src/app/api/v2/products/sync/profiles/[id]/route.ts` | 30 |
| `src/app/api/kangur/ai-tutor/content/route.ts` | 29 |
| `src/app/api/kangur/ai-tutor/native-guide/route.ts` | 29 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 28 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 28 |
| `src/app/api/v2/products/categories/[id]/route.ts` | 28 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `kangur -> cms` | 25 |
| `cms -> gsap` | 20 |
| `case-resolver -> case-resolver-capture` | 18 |
| `case-resolver -> foldertree` | 15 |
| `case-resolver -> filemaker` | 13 |
| `case-resolver -> document-editor` | 12 |
| `drafter -> products` | 11 |
| `kangur -> foldertree` | 11 |
| `case-resolver -> ai` | 9 |
| `cms -> viewer3d` | 8 |
| `products -> internationalization` | 8 |
| `products -> foldertree` | 7 |
| `prompt-exploder -> foldertree` | 7 |
| `admin -> foldertree` | 5 |
| `cms -> foldertree` | 5 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/kangur/server/knowledge-graph/retrieval.ts` | 1649 |
| `src/features/kangur/admin/AdminKangurTestSuitesManagerPage.tsx` | 1572 |
| `src/features/kangur/ui/components/ClockTrainingGame.tsx` | 1466 |
| `src/features/kangur/admin/KangurLessonDocumentEditor.tsx` | 1442 |
| `src/features/kangur/server/context-registry.ts` | 1433 |
| `src/features/kangur/cms-builder/project-defaults.ts` | 1422 |
| `src/features/cms/components/frontend/CmsStorefrontAppearance.logic.ts` | 1414 |
| `src/shared/contracts/kangur-ai-tutor-native-guide-entries.ts` | 1414 |
| `src/features/kangur/observability/summary.ts` | 1401 |
| `src/features/kangur/ui/components/LessonAnimations.tsx` | 1374 |
| `src/features/kangur/admin/KangurQuestionsManagerPanel.tsx` | 1370 |
| `src/features/kangur/server/knowledge-graph/retrieval.test.ts` | 1340 |
| `src/features/kangur/ui/pages/Lessons.test.tsx` | 1322 |
| `src/features/kangur/admin/components/KangurPageContentSettingsPanel.tsx` | 1308 |
| `src/features/kangur/server/ai-tutor-adaptive.ts` | 1223 |
| `src/features/kangur/ui/KangurLoginPage.test.tsx` | 1222 |
| `src/features/kangur/ui/KangurLoginPage.tsx` | 1219 |
| `src/shared/contracts/kangur-ai-tutor-content.ts` | 1181 |
| `src/shared/contracts/image-studio.ts` | 1162 |
| `src/features/kangur/ui/components/ClockLesson.tsx` | 1159 |
