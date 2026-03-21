---
owner: 'Platform Team'
last_reviewed: '2026-03-21'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-03-21T10:39:04.716Z

## Snapshot

- Source files: 7102
- Source lines: 1157762
- use client files: 2
- Files >= 1000 LOC: 0
- Files >= 1500 LOC: 0
- Largest file: `src/app/(frontend)/products/[id]/ProductPublicPage.tsx` (301 LOC)
- API routes: 29
- API delegated server routes: 159
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 285/29 (982.8%)
- Cross-feature dependency pairs: 3
- Shared -> features imports: 1
- setInterval occurrences: 0
- Prop-drilling chains (depth >= 3): 20
- Prop-drilling chains (depth >= 4): 5

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/products/[[...path]]/route.ts` | 282 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 236 |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 232 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 230 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 206 |
| `src/app/api/databases/[[...path]]/route.ts` | 204 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 169 |
| `src/app/api/agent/leases/route.ts` | 122 |
| `src/app/api/kangur/[[...path]]/route.ts` | 63 |
| `src/app/api/agent/resources/route.ts` | 59 |
| `src/app/api/agent/approval-gates/route.ts` | 50 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 33 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 33 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 25 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `kangur -> cms` | 10 |
| `admin -> foldertree` | 2 |
| `integrations -> product-sync` | 1 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/kangur/ui/components/SubtractingLesson.tsx` | 1708 |
| `src/features/kangur/ui/components/AddingLesson.tsx` | 1688 |
| `src/features/kangur/server/ai-tutor-content-locale-scaffold.ts` | 1566 |
| `src/features/kangur/ui/components/KangurPrimaryNavigation.test.tsx` | 1540 |
| `src/features/kangur/server/ai-tutor-native-guide-locale-scaffold.ts` | 1266 |
| `src/features/kangur/ui/components/KangurGameOperationSelectorWidget.tsx` | 1219 |
| `src/features/kangur/ui/pages/Game.tsx` | 1143 |
| `src/features/kangur/admin/components/KangurAiTutorContentSettingsPanel.tsx` | 1131 |
| `src/features/cms/components/frontend/CmsStorefrontAppearance.logic.ts` | 1128 |
| `src/features/kangur/page-content-catalog.ts` | 1105 |
| `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 1086 |
| `src/features/kangur/ui/services/delegated-assignments.ts` | 1081 |
| `src/features/kangur/ui/components/LogicalThinkingLesson.tsx` | 1069 |
| `src/app/api/kangur/ai-tutor/chat/handler.ts` | 1046 |
| `src/features/kangur/ui/components/animations/AddingAnimations.tsx` | 1041 |
| `src/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter.loaders.ts` | 1041 |
| `src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine.test.ts` | 1035 |
| `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx` | 1031 |
| `src/shared/contracts/cms.ts` | 1023 |
| `src/features/kangur/ui/components/GeometryDrawingGame.tsx` | 1000 |
