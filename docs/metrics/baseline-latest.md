# Architecture & Performance Baseline

Generated at: 2026-02-16T23:53:41.748Z

## Snapshot

- Source files: 2398
- Source lines: 407635
- use client files: 897
- Files >= 1000 LOC: 46
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
| `src/app/api/integrations/import-templates/[id]/route.ts` | 98 |
| `src/app/api/settings/database/sync/route.ts` | 97 |
| `src/app/api/image-studio/mask/ai/route.ts` | 96 |
| `src/app/api/image-studio/slots/[slotId]/screenshot/route.ts` | 96 |
| `src/app/api/auth/mfa/disable/route.ts` | 94 |
| `src/app/api/cms/slugs/[id]/domains/route.ts` | 94 |
| `src/app/api/marketplace/categories/fetch/route.ts` | 93 |
| `src/app/api/cms/pages/route.ts` | 91 |
| `src/app/api/products/[id]/studio/route.ts` | 91 |
| `src/app/api/integrations/imports/base/runs/route.ts` | 90 |
| `src/app/api/ai-paths/runtime-analytics/summary/route.ts` | 89 |
| `src/app/api/currencies/[id]/route.ts` | 89 |
| `src/app/api/ai-paths/trigger-buttons/[id]/route.ts` | 88 |
| `src/app/api/integrations/export-templates/[id]/route.ts` | 88 |
| `src/app/api/databases/backups/route.ts` | 86 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `integrations -> products` | 51 |
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
| `src/features/cms/components/page-builder/registry/block-definitions.ts` | 1692 |
| `src/features/case-resolver/pages/AdminCaseResolverCasesPage.tsx` | 1663 |
| `src/features/ai/image-studio/components/CenterPreview.tsx` | 1614 |
| `src/features/products/components/settings/validator-settings/useValidatorSettingsController.ts` | 1555 |
