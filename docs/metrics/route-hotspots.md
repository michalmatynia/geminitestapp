# Route Hotspots (Static Heuristic)

Generated at: 2026-02-26T00:28:22.962Z

This report ranks route/page complexity using LOC as a fast heuristic baseline.

## Top API Routes by LOC

| Route | LOC |
| --- | ---: |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 90 |
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
| `src/app/api/products/categories/route.ts` | 24 |
| `src/app/api/settings/route.ts` | 23 |
| `src/app/api/auth/users/[id]/security/route.ts` | 21 |
| `src/app/api/products/simple-parameters/route.ts` | 21 |
| `src/app/api/products/validator-settings/route.ts` | 21 |
| `src/app/api/price-groups/route.ts` | 20 |

## Top App Pages by LOC

| Page | LOC |
| --- | ---: |
| `src/app/(frontend)/page.tsx` | 121 |
| `src/app/(frontend)/[...slug]/page.tsx` | 63 |
| `src/app/(frontend)/preview/[id]/page.tsx` | 63 |
| `src/app/(admin)/admin/agentcreator/page.tsx` | 45 |
| `src/app/(admin)/admin/agentcreator/teaching/page.tsx` | 45 |
| `src/app/(admin)/admin/settings/recovery/page.tsx` | 45 |
| `src/app/(admin)/admin/page.tsx` | 42 |
| `src/app/(admin)/admin/settings/logging/page.tsx` | 32 |
| `src/app/(admin)/admin/chatbot/context/page.tsx` | 14 |
| `src/app/(admin)/admin/chatbot/page.tsx` | 14 |
| `src/app/(admin)/admin/integrations/marketplaces/page.tsx` | 14 |
| `src/app/(admin)/admin/integrations/page.tsx` | 14 |
| `src/app/(admin)/admin/notes/notebooks/page.tsx` | 14 |
| `src/app/(admin)/admin/settings/playwright/page.tsx` | 14 |
| `src/app/(admin)/admin/system/logs/page.tsx` | 14 |
| `src/app/(frontend)/products/[id]/page.tsx` | 14 |
| `src/app/auth/signin/page.tsx` | 14 |
| `src/app/(admin)/admin/cms/slugs/create/page.tsx` | 13 |
| `src/app/(admin)/admin/cms/slugs/page.tsx` | 13 |
| `src/app/(admin)/admin/products/[id]/edit/page.tsx` | 13 |

## Recommended First Runtime Profiling Targets

- `src/app/api/chatbot/agent/[runId]/[action]/route.ts`
- `src/app/api/integrations/exports/base/[setting]/route.ts`
- `src/app/api/integrations/imports/base/[setting]/route.ts`
- `src/app/api/marketplace/[resource]/route.ts`
- `src/app/api/products/[id]/route.ts`
- `src/app/api/products/sync/profiles/[id]/route.ts`
- `src/app/api/auth/users/[id]/route.ts`
- `src/app/api/products/validator-patterns/route.ts`
- `src/app/api/user/preferences/route.ts`
- `src/app/api/integrations/imports/base/runs/route.ts`
