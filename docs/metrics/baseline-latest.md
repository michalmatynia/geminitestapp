# Architecture & Performance Baseline

Generated at: 2026-02-16T22:06:57.112Z

## Snapshot

- Source files: 2295
- Source lines: 406018
- use client files: 895
- Files >= 1000 LOC: 47
- Files >= 1500 LOC: 20
- Largest file: `src/features/database/services/database-sync.ts` (3352 LOC)
- API routes: 294
- API delegated server routes: 21
- API routes without apiHandler/delegation: 0
- API explicit cache policy coverage: 294/294 (100.0%)
- Cross-feature dependency pairs: 118
- Shared -> features imports: 15
- setInterval occurrences: 21

## Top API Hotspots (by LOC)

| Route | LOC |
| --- | ---: |
| `src/app/api/ai-paths/db-action/route.ts` | 575 |
| `src/app/api/chatbot/route.ts` | 559 |
| `src/app/api/databases/preview/route.ts` | 550 |
| `src/app/api/integrations/imports/base/route.ts` | 526 |
| `src/app/api/auth/users/[id]/route.ts` | 412 |
| `src/app/api/image-studio/projects/[projectId]/route.ts` | 409 |
| `src/app/api/image-studio/slots/[slotId]/masks/route.ts` | 395 |
| `src/app/api/integrations/imports/base/parameters/route.ts` | 383 |
| `src/app/api/image-studio/projects/[projectId]/assets/import/route.ts` | 372 |
| `src/app/api/ai-paths/runs/[runId]/stream/route.ts` | 364 |
| `src/app/api/image-studio/prompt-extract/route.ts` | 359 |
| `src/app/api/products/validator-patterns/[id]/route.ts` | 349 |
| `src/app/api/price-groups/route.ts` | 318 |
| `src/app/api/databases/schema/route.ts` | 306 |
| `src/app/api/databases/restore/route.ts` | 297 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `integrations -> products` | 44 |
| `ai -> observability` | 42 |
| `products -> observability` | 29 |
| `jobs -> observability` | 28 |
| `prompt-exploder -> prompt-engine` | 28 |
| `drafter -> products` | 26 |
| `jobs -> ai` | 24 |
| `products -> ai` | 23 |
| `cms -> gsap` | 20 |
| `integrations -> observability` | 19 |
| `integrations -> data-import-export` | 16 |
| `ai -> prompt-engine` | 14 |
| `cms -> observability` | 14 |
| `ai -> products` | 13 |
| `auth -> observability` | 12 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/database/services/database-sync.ts` | 3352 |
| `src/features/prompt-exploder/parser.ts` | 2811 |
| `src/features/ai/ai-paths/lib/core/runtime/handlers/integration.ts` | 2481 |
| `src/features/ai/agent-runtime/planning/llm.ts` | 2225 |
| `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsState.ts` | 2203 |
| `src/features/case-resolver/settings.ts` | 2145 |
| `src/features/ai/image-studio/components/GenerationToolbar.tsx` | 2131 |
| `src/features/integrations/services/exports/base-exporter.ts` | 2094 |
| `src/features/ai/ai-paths/lib/core/runtime/engine.ts` | 2045 |
| `src/features/case-resolver/components/CaseResolverRelationsWorkspace.tsx` | 2031 |
| `src/shared/ui/vector-canvas.tsx` | 1986 |
| `src/features/prompt-exploder/components/SegmentEditorPanel.tsx` | 1908 |
| `src/features/ai/agent-runtime/tools/index.ts` | 1882 |
| `src/features/case-resolver/components/CaseResolverCanvasWorkspace.tsx` | 1806 |
| `src/features/ai/ai-paths/components/job-queue-panel.tsx` | 1787 |
| `src/features/ai/ai-paths/components/node-config/dialog/RegexNodeConfigSection.tsx` | 1763 |
| `src/features/case-resolver/pages/AdminCaseResolverCasesPage.tsx` | 1725 |
| `src/features/cms/components/page-builder/registry/block-definitions.ts` | 1692 |
| `src/features/products/components/settings/validator-settings/useValidatorSettingsController.ts` | 1555 |
| `src/features/ai/image-studio/components/CenterPreview.tsx` | 1530 |
