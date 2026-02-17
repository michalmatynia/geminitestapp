# Route Hotspots (Static Heuristic)

Generated at: 2026-02-17T00:41:53.526Z

This report ranks route/page complexity using LOC as a fast heuristic baseline.

## Top API Routes by LOC

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
| `src/app/api/image-studio/cards/backfill/route.ts` | 48 |
| `src/app/api/products/validator-decisions/route.ts` | 48 |
| `src/app/api/agentcreator/teaching/collections/route.ts` | 47 |
| `src/app/api/cms/media/route.ts` | 47 |
| `src/app/api/integrations/imports/base/export-warehouse/route.ts` | 47 |

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

- `src/app/api/integrations/route.ts`
- `src/app/api/system/activity/route.ts`
- `src/app/api/system/logs/interpret/route.ts`
- `src/app/api/ai-paths/runs/[runId]/resume/route.ts`
- `src/app/api/ai-paths/runs/[runId]/retry-node/route.ts`
- `src/app/api/products/sync/runs/[runId]/route.ts`
- `src/app/api/image-studio/runs/route.ts`
- `src/app/api/integrations/exports/base/active-template/route.ts`
- `src/app/api/integrations/imports/base/active-template/route.ts`
- `src/app/api/databases/delete/route.ts`
