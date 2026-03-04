# Route Hotspots (Static Heuristic)

Generated at: 2026-03-04T00:58:49.624Z

This report ranks route/page complexity using LOC as a fast heuristic baseline.

## Top API Routes by LOC

| Route | LOC |
| --- | ---: |
| `src/app/api/integrations/exports/base/[setting]/route.ts` | 85 |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 83 |
| `src/app/api/integrations/imports/base/[setting]/route.ts` | 69 |
| `src/app/api/products/[id]/studio/[action]/route.ts` | 40 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/products/[id]/route.ts` | 31 |
| `src/app/api/price-groups/[id]/route.ts` | 28 |
| `src/app/api/countries/[id]/route.ts` | 26 |
| `src/app/api/currencies/[id]/route.ts` | 26 |
| `src/app/api/ai/schema/[entity]/route.ts` | 25 |
| `src/app/api/languages/[id]/route.ts` | 25 |
| `src/app/api/auth/users/[id]/route.ts` | 23 |
| `src/app/api/products/sync/profiles/[id]/route.ts` | 23 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 22 |
| `src/app/api/v2/products/entities/[type]/[id]/route.ts` | 22 |
| `src/app/api/v2/products/metadata/[type]/[id]/route.ts` | 22 |
| `src/app/api/auth/users/[id]/security/route.ts` | 21 |
| `src/app/api/drafts/[id]/route.ts` | 21 |
| `src/app/api/products/validator-patterns/route.ts` | 21 |
| `src/app/api/ai/context/related/[id]/route.ts` | 20 |

## Top App Pages by LOC

| Page | LOC |
| --- | ---: |
| `src/app/(frontend)/[...slug]/page.tsx` | 67 |
| `src/app/(frontend)/preview/[id]/page.tsx` | 67 |
| `src/app/(admin)/admin/settings/recovery/page.tsx` | 50 |
| `src/app/(frontend)/page.tsx` | 48 |
| `src/app/(admin)/admin/agentcreator/teaching/page.tsx` | 45 |
| `src/app/(admin)/admin/agentcreator/page.tsx` | 42 |
| `src/app/(admin)/admin/page.tsx` | 40 |
| `src/app/(admin)/admin/settings/logging/page.tsx` | 32 |
| `src/app/(frontend)/products/[id]/page.tsx` | 15 |
| `src/app/(admin)/admin/chatbot/context/page.tsx` | 14 |
| `src/app/(admin)/admin/chatbot/page.tsx` | 14 |
| `src/app/(admin)/admin/integrations/marketplaces/page.tsx` | 14 |
| `src/app/(admin)/admin/integrations/page.tsx` | 14 |
| `src/app/(admin)/admin/notes/notebooks/page.tsx` | 14 |
| `src/app/(admin)/admin/settings/playwright/page.tsx` | 14 |
| `src/app/(admin)/admin/system/logs/page.tsx` | 14 |
| `src/app/auth/signin/page.tsx` | 14 |
| `src/app/(admin)/admin/cms/slugs/create/page.tsx` | 13 |
| `src/app/(admin)/admin/cms/slugs/page.tsx` | 13 |
| `src/app/(admin)/admin/products/[id]/edit/page.tsx` | 13 |

## Recommended First Runtime Profiling Targets

- `src/app/api/integrations/exports/base/[setting]/route.ts`
- `src/app/api/chatbot/agent/[runId]/[action]/route.ts`
- `src/app/api/integrations/imports/base/[setting]/route.ts`
- `src/app/api/products/[id]/studio/[action]/route.ts`
- `src/app/api/marketplace/[resource]/route.ts`
- `src/app/api/products/[id]/route.ts`
- `src/app/api/price-groups/[id]/route.ts`
- `src/app/api/countries/[id]/route.ts`
- `src/app/api/currencies/[id]/route.ts`
- `src/app/api/ai/schema/[entity]/route.ts`
