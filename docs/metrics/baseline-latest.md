# Architecture & Performance Baseline

Generated at: 2026-02-17T00:41:52.914Z

## Snapshot

- Source files: 2493
- Source lines: 412647
- use client files: 897
- Files >= 1000 LOC: 47
- Files >= 1500 LOC: 21
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
| `src/app/api/integrations/route.ts` | 52 |
| `src/app/api/system/activity/route.ts` | 52 |
| `src/app/api/system/logs/interpret/route.ts` | 52 |
| `src/app/api/ai-paths/runs/[runId]/resume/route.ts` | 51 |
| `src/app/api/ai-paths/runs/[runId]/retry-node/route.ts` | 51 |
| `src/app/api/products/sync/runs/[runId]/route.ts` | 51 |
| `src/app/api/image-studio/runs/route.ts` | 50 |
| `src/app/api/integrations/exports/base/active-template/route.ts` | 50 |
| `src/app/api/integrations/imports/base/active-template/route.ts` | 50 |
| `src/app/api/databases/delete/route.ts` | 49 |
| `src/app/api/drafts/route.ts` | 49 |
| `src/app/api/integrations/connections/[id]/session/route.ts` | 49 |
| `src/app/api/integrations/exports/base/default-connection/route.ts` | 49 |
| `src/app/api/notes/categories/[id]/route.ts` | 49 |
| `src/app/api/system/upload-events/route.ts` | 49 |

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
| `ai -> products` | 18 |
| `integrations -> data-import-export` | 16 |
| `ai -> prompt-engine` | 15 |
| `cms -> observability` | 14 |
| `auth -> observability` | 12 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/database/services/database-sync.ts` | 3352 |
| `src/features/prompt-exploder/parser.ts` | 2811 |
| `src/features/ai/image-studio/components/StudioModals.tsx` | 2685 |
| `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsState.ts` | 2524 |
| `src/features/ai/ai-paths/lib/core/runtime/handlers/integration.ts` | 2481 |
| `src/features/ai/agent-runtime/planning/llm.ts` | 2225 |
| `src/features/integrations/services/exports/base-exporter.ts` | 2148 |
| `src/features/case-resolver/settings.ts` | 2145 |
| `src/features/ai/image-studio/components/GenerationToolbar.tsx` | 2131 |
| `src/features/ai/ai-paths/lib/core/runtime/engine.ts` | 2045 |
| `src/features/case-resolver/components/CaseResolverRelationsWorkspace.tsx` | 2031 |
| `src/shared/ui/vector-canvas.tsx` | 1986 |
| `src/features/prompt-exploder/components/SegmentEditorPanel.tsx` | 1908 |
| `src/features/ai/agent-runtime/tools/index.ts` | 1882 |
| `src/features/case-resolver/components/CaseResolverCanvasWorkspace.tsx` | 1806 |
| `src/features/ai/ai-paths/components/job-queue-panel.tsx` | 1787 |
| `src/features/ai/ai-paths/components/node-config/dialog/RegexNodeConfigSection.tsx` | 1763 |
| `src/features/case-resolver/pages/AdminCaseResolverCasesPage.tsx` | 1726 |
| `src/features/cms/components/page-builder/registry/block-definitions.ts` | 1692 |
| `src/features/ai/image-studio/components/CenterPreview.tsx` | 1629 |
