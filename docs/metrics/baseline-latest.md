---
owner: 'Platform Team'
last_reviewed: '2026-03-18'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Architecture & Performance Baseline

Generated at: 2026-03-18T04:08:22.402Z

## Snapshot

- Source files: 6611
- Source lines: 1061807
- use client files: 1
- Files >= 1000 LOC: 0
- Files >= 1500 LOC: 0
- Largest file: `src/app/(frontend)/products/[id]/ProductPublicPage.tsx` (273 LOC)
- API routes: 29
- API delegated server routes: 158
- API routes without apiHandler/delegation: 1
- API explicit cache policy coverage: 283/29 (975.9%)
- Cross-feature dependency pairs: 8
- Shared -> features imports: 1
- setInterval occurrences: 0
- Prop-drilling chains (depth >= 3): 42
- Prop-drilling chains (depth >= 4): 1

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/products/[[...path]]/route.ts` | 383 |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 339 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 289 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 256 |
| `src/app/api/databases/[[...path]]/route.ts` | 229 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 214 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 172 |
| `src/app/api/agent/leases/route.ts` | 122 |
| `src/app/api/kangur/[[...path]]/route.ts` | 80 |
| `src/app/api/agent/resources/route.ts` | 59 |
| `src/app/api/agent/approval-gates/route.ts` | 50 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 33 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 33 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 25 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `kangur -> cms` | 11 |
| `products -> internationalization` | 4 |
| `admin -> foldertree` | 2 |
| `admin -> observability` | 1 |
| `admin -> prompt-engine` | 1 |
| `admin -> products` | 1 |
| `ai -> files` | 1 |
| `cms -> admin` | 1 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/shared/contracts/kangur-ai-tutor-native-guide-entries.ts` | 1459 |
| `src/features/kangur/ui/components/WebDevelopmentReactComponentsLesson.data.tsx` | 1377 |
| `src/shared/contracts/kangur-ai-tutor-content.ts` | 1189 |
| `src/features/kangur/cms-builder/defaults/game-defaults.ts` | 1188 |
| `src/features/kangur/ui/components/ClockLesson.tsx` | 1164 |
| `src/features/kangur/services/local-kangur-platform-duels.ts` | 1144 |
| `src/features/kangur/admin/AdminKangurLessonsManagerPage.tsx` | 1137 |
| `src/features/kangur/ui/components/KangurAssignmentManager.tsx` | 1133 |
| `src/shared/contracts/kangur.ts` | 1115 |
| `src/features/kangur/ui/components/GeometrySymmetryGame.tsx` | 1113 |
| `src/features/cms/components/page-builder/registry/block-definitions-content.ts` | 1112 |
| `src/features/kangur/ui/context/KangurAiTutorRuntime.shared.ts` | 1087 |
| `src/features/kangur/admin/AdminKangurObservabilityPage.test.tsx` | 1077 |
| `src/features/prompt-engine/components/RuleItem.tsx` | 1075 |
| `src/features/ai/ai-paths/components/__tests__/canvas-connection-preview.test.tsx` | 1055 |
| `src/features/kangur/themes/others.ts` | 1054 |
| `src/features/kangur/ui/components/NumberBalanceRushGame.tsx` | 1051 |
| `src/features/kangur/ui/components/animations/AddingAnimations.tsx` | 1041 |
| `src/shared/lib/ai-paths/core/validation-engine/docs-registry-adapter.loaders.ts` | 1041 |
| `src/features/prompt-engine/context/PromptEngineContext.tsx` | 1035 |
