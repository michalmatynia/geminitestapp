# Architecture & Performance Baseline

Generated at: 2026-02-17T16:32:39.028Z

## Snapshot

- Source files: 2657
- Source lines: 427283
- use client files: 897
- Files >= 1000 LOC: 19
- Files >= 1500 LOC: 19
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
| `src/app/api/integrations/exports/base/[setting]/route.ts` | 86 |
| `src/app/api/integrations/imports/base/[setting]/route.ts` | 70 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/products/[id]/route.ts` | 36 |
| `src/app/api/products/sync/profiles/[id]/route.ts` | 28 |
| `src/app/api/auth/users/[id]/route.ts` | 27 |
| `src/app/api/products/validator-patterns/route.ts` | 27 |
| `src/app/api/user/preferences/route.ts` | 26 |
| `src/app/api/integrations/imports/base/runs/route.ts` | 25 |
| `src/app/api/products/categories/[id]/route.ts` | 25 |
| `src/app/api/chatbot/sessions/route.ts` | 24 |
| `src/app/api/integrations/export-templates/[id]/route.ts` | 24 |
| `src/app/api/integrations/import-templates/[id]/route.ts` | 24 |
| `src/app/api/settings/route.ts` | 23 |
| `src/app/api/auth/users/[id]/security/route.ts` | 21 |

## Top Cross-Feature Dependencies

| Edge | References |
| --- | ---: |
| `integrations -> products` | 56 |
| `ai -> observability` | 42 |
| `jobs -> observability` | 30 |
| `products -> observability` | 30 |
| `prompt-exploder -> prompt-engine` | 30 |
| `drafter -> products` | 26 |
| `jobs -> ai` | 26 |
| `products -> ai` | 25 |
| `cms -> gsap` | 22 |
| `ai -> products` | 19 |
| `integrations -> observability` | 19 |
| `integrations -> data-import-export` | 16 |
| `ai -> prompt-engine` | 15 |
| `cms -> observability` | 14 |
| `data-import-export -> integrations` | 13 |

## Top File Hotspots (by LOC)

| File | LOC |
| --- | ---: |
| `src/features/database/services/database-sync.ts` | 3352 |
| `src/features/ai/image-studio/components/StudioModals.tsx` | 2842 |
| `src/features/prompt-exploder/parser.ts` | 2811 |
| `src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsState.ts` | 2524 |
| `src/features/ai/ai-paths/lib/core/runtime/handlers/integration.ts` | 2481 |
| `src/features/case-resolver/pages/AdminCaseResolverCasesPage.tsx` | 2422 |
| `src/features/case-resolver/settings.ts` | 2408 |
| `src/shared/ui/vector-canvas.tsx` | 2364 |
| `src/features/ai/agent-runtime/planning/llm.ts` | 2225 |
| `src/features/ai/image-studio/components/GenerationToolbar.tsx` | 2129 |
| `src/features/ai/ai-paths/lib/core/runtime/engine.ts` | 2045 |
| `src/features/prompt-exploder/components/SegmentEditorPanel.tsx` | 1908 |
| `src/features/ai/image-studio/components/SequencingPanel.tsx` | 1896 |
| `src/features/ai/agent-runtime/tools/index.ts` | 1882 |
| `src/features/case-resolver/hooks/useCaseResolverState.ts` | 1817 |
| `src/features/case-resolver/components/CaseResolverCanvasWorkspace.tsx` | 1808 |
| `src/features/ai/image-studio/components/RightSidebar.tsx` | 1806 |
| `src/features/ai/image-studio/components/CenterPreview.tsx` | 1766 |
| `src/features/ai/ai-paths/components/node-config/dialog/RegexNodeConfigSection.tsx` | 1763 |
| `src/app/api/image-studio/slots/[slotId]/upscale/handler.ts` | 999 |
