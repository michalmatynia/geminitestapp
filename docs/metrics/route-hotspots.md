# Route Hotspots (Static Heuristic)

Generated at: 2026-02-17T00:27:46.837Z

This report ranks route/page complexity using LOC as a fast heuristic baseline.

## Top API Routes by LOC

| Route | LOC |
| --- | ---: |
| `src/app/api/integrations/imports/base/runs/[runId]/route.ts` | 60 |
| `src/app/api/marketplace/producer-mappings/bulk/route.ts` | 60 |
| `src/app/api/marketplace/tag-mappings/bulk/route.ts` | 60 |
| `src/app/api/ai-paths/runs/[runId]/route.ts` | 59 |
| `src/app/api/databases/upload/route.ts` | 59 |
| `src/app/api/integrations/[id]/connections/[connectionId]/base/inventories/route.ts` | 59 |
| `src/app/api/products/ai-jobs/[jobId]/route.ts` | 59 |
| `src/app/api/prompt-runtime/health/route.ts` | 59 |
| `src/app/api/databases/engine/backup-scheduler/tick/route.ts` | 58 |
| `src/app/api/marketplace/mappings/bulk/route.ts` | 58 |
| `src/app/api/products/images/base64/route.ts` | 58 |
| `src/app/api/integrations/exports/base/image-retry-presets/route.ts` | 57 |
| `src/app/api/integrations/imports/base/runs/[runId]/resume/route.ts` | 57 |
| `src/app/api/assets3d/[id]/route.ts` | 56 |
| `src/app/api/products/[id]/studio/accept/route.ts` | 56 |
| `src/app/api/cms/themes/[id]/route.ts` | 55 |
| `src/app/api/integrations/export-templates/route.ts` | 55 |
| `src/app/api/notes/categories/route.ts` | 54 |
| `src/app/api/notes/tags/route.ts` | 54 |
| `src/app/api/products/[id]/studio/send/route.ts` | 54 |

## Top App Pages by LOC

| Page | LOC |
| --- | ---: |
| `src/app/(frontend)/page.tsx` | 452 |
| `src/app/(admin)/admin/settings/recovery/page.tsx` | 332 |
| `src/app/(frontend)/[...slug]/page.tsx` | 167 |
| `src/app/(admin)/admin/settings/logging/page.tsx` | 137 |
| `src/app/(admin)/admin/page.tsx` | 102 |
| `src/app/(frontend)/preview/[id]/page.tsx` | 101 |
| `src/app/(admin)/admin/agentcreator/page.tsx` | 45 |
| `src/app/(admin)/admin/agentcreator/teaching/page.tsx` | 45 |
| `src/app/(admin)/admin/chatbot/context/page.tsx` | 14 |
| `src/app/(admin)/admin/chatbot/page.tsx` | 14 |
| `src/app/(admin)/admin/integrations/marketplaces/page.tsx` | 14 |
| `src/app/(admin)/admin/integrations/page.tsx` | 14 |
| `src/app/(admin)/admin/notes/notebooks/page.tsx` | 14 |
| `src/app/(admin)/admin/settings/playwright/page.tsx` | 14 |
| `src/app/(admin)/admin/system/logs/page.tsx` | 14 |
| `src/app/(frontend)/products/[id]/page.tsx` | 14 |
| `src/app/auth/signin/page.tsx` | 14 |
| `src/app/(admin)/admin/products/[id]/edit/page.tsx` | 13 |
| `src/app/(admin)/admin/cms/slugs/create/page.tsx` | 12 |
| `src/app/(admin)/admin/cms/slugs/page.tsx` | 12 |

## Recommended First Runtime Profiling Targets

- `src/app/api/integrations/imports/base/runs/[runId]/route.ts`
- `src/app/api/marketplace/producer-mappings/bulk/route.ts`
- `src/app/api/marketplace/tag-mappings/bulk/route.ts`
- `src/app/api/ai-paths/runs/[runId]/route.ts`
- `src/app/api/databases/upload/route.ts`
- `src/app/api/integrations/[id]/connections/[connectionId]/base/inventories/route.ts`
- `src/app/api/products/ai-jobs/[jobId]/route.ts`
- `src/app/api/prompt-runtime/health/route.ts`
- `src/app/api/databases/engine/backup-scheduler/tick/route.ts`
- `src/app/api/marketplace/mappings/bulk/route.ts`
