# Route Hotspots (Static Heuristic)

Generated at: 2026-02-16T21:41:08.908Z

This report ranks route/page complexity using LOC as a fast heuristic baseline.

## Top API Routes by LOC

| Route | LOC |
| --- | ---: |
| `src/app/api/integrations/products/[id]/export-to-base/route.ts` | 1468 |
| `src/app/api/integrations/[id]/connections/[connectionId]/test/route.ts` | 1165 |
| `src/app/api/image-studio/slots/[slotId]/upscale/route.ts` | 1009 |
| `src/app/api/products/validator-runtime/evaluate/route.ts` | 908 |
| `src/app/api/settings/route.ts` | 775 |
| `src/app/api/image-studio/slots/[slotId]/crop/route.ts` | 765 |
| `src/app/api/image-studio/slots/[slotId]/center/route.ts` | 763 |
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

- `src/app/api/integrations/products/[id]/export-to-base/route.ts`
- `src/app/api/integrations/[id]/connections/[connectionId]/test/route.ts`
- `src/app/api/image-studio/slots/[slotId]/upscale/route.ts`
- `src/app/api/products/validator-runtime/evaluate/route.ts`
- `src/app/api/settings/route.ts`
- `src/app/api/image-studio/slots/[slotId]/crop/route.ts`
- `src/app/api/image-studio/slots/[slotId]/center/route.ts`
- `src/app/api/ai-paths/db-action/route.ts`
- `src/app/api/chatbot/route.ts`
- `src/app/api/databases/preview/route.ts`
