# Route Hotspots (Static Heuristic)

Generated at: 2026-03-07T08:20:23.642Z

This report ranks route/page complexity using LOC as a fast heuristic baseline.

## Top API Routes by LOC

| Route | LOC |
| --- | ---: |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 83 |
| `src/app/api/v2/products/[id]/studio/[action]/route.ts` | 40 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/v2/products/[id]/route.ts` | 36 |
| `src/app/api/v2/products/sync/profiles/[id]/route.ts` | 28 |
| `src/app/api/v2/products/categories/[id]/route.ts` | 25 |
| `src/app/api/v2/products/categories/route.ts` | 24 |
| `src/app/api/v2/products/parameters/route.ts` | 24 |
| `src/app/api/auth/users/[id]/route.ts` | 23 |
| `src/app/api/v2/products/sync/profiles/route.ts` | 23 |
| `src/app/api/ai/schema/[entity]/route.ts` | 22 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 22 |
| `src/app/api/v2/products/entities/[type]/[id]/route.ts` | 22 |
| `src/app/api/v2/products/metadata/[type]/[id]/route.ts` | 22 |
| `src/app/api/auth/users/[id]/security/route.ts` | 21 |
| `src/app/api/drafts/[id]/route.ts` | 21 |
| `src/app/api/v2/products/validator-patterns/route.ts` | 21 |
| `src/app/api/v2/products/validator-settings/route.ts` | 21 |
| `src/app/api/ai/context/related/[id]/route.ts` | 20 |
| `src/app/api/v2/integrations/imports/base/runs/route.ts` | 20 |

## Top App Pages by LOC

| Page | LOC |
| --- | ---: |
| `src/app/(frontend)/preview/foldertree-shell-runtime/page.tsx` | 189 |
| `src/app/(frontend)/kangur/login/page.tsx` | 153 |
| `src/app/(frontend)/[...slug]/page.tsx` | 67 |
| `src/app/(frontend)/preview/[id]/page.tsx` | 67 |
| `src/app/(admin)/admin/settings/recovery/page.tsx` | 50 |
| `src/app/(frontend)/page.tsx` | 48 |
| `src/app/(admin)/admin/agentcreator/teaching/page.tsx` | 46 |
| `src/app/(admin)/admin/agentcreator/page.tsx` | 43 |
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

## Recommended First Runtime Profiling Targets

- `src/app/api/chatbot/agent/[runId]/[action]/route.ts`
- `src/app/api/v2/products/[id]/studio/[action]/route.ts`
- `src/app/api/marketplace/[resource]/route.ts`
- `src/app/api/v2/products/[id]/route.ts`
- `src/app/api/v2/products/sync/profiles/[id]/route.ts`
- `src/app/api/v2/products/categories/[id]/route.ts`
- `src/app/api/v2/products/categories/route.ts`
- `src/app/api/v2/products/parameters/route.ts`
- `src/app/api/auth/users/[id]/route.ts`
- `src/app/api/v2/products/sync/profiles/route.ts`
