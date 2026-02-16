# Route Hotspots (Static Heuristic)

Generated at: 2026-02-16T23:53:42.360Z

This report ranks route/page complexity using LOC as a fast heuristic baseline.

## Top API Routes by LOC

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
| `src/app/api/products/ai-jobs/enqueue/route.ts` | 86 |
| `src/app/api/ai-paths/runs/enqueue/route.ts` | 85 |
| `src/app/api/marketplace/mappings/route.ts` | 85 |
| `src/app/api/notes/[id]/files/route.ts` | 85 |
| `src/app/api/ai-paths/runs/[runId]/cancel/route.ts` | 84 |

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
| `src/app/(admin)/admin/products/builder/page.tsx` | 17 |
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

## Recommended First Runtime Profiling Targets

- `src/app/api/integrations/import-templates/[id]/route.ts`
- `src/app/api/settings/database/sync/route.ts`
- `src/app/api/image-studio/mask/ai/route.ts`
- `src/app/api/image-studio/slots/[slotId]/screenshot/route.ts`
- `src/app/api/auth/mfa/disable/route.ts`
- `src/app/api/cms/slugs/[id]/domains/route.ts`
- `src/app/api/marketplace/categories/fetch/route.ts`
- `src/app/api/cms/pages/route.ts`
- `src/app/api/products/[id]/studio/route.ts`
- `src/app/api/integrations/imports/base/runs/route.ts`
