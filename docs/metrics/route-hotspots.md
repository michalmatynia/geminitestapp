---
owner: 'Platform Team'
last_reviewed: '2026-03-18'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Route Hotspots (Static Heuristic)

Generated at: 2026-03-18T09:01:36.077Z

This report ranks route/page complexity using LOC as a fast heuristic baseline.

## Top API Routes by LOC

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/products/[[...path]]/route.ts` | 383 |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 339 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 289 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 256 |
| `src/app/api/databases/[[...path]]/route.ts` | 229 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 214 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 172 |
| `src/app/api/agent/leases/route.ts` | 122 |
| `src/app/api/kangur/[[...path]]/route.ts` | 80 |
| `src/app/api/agent/resources/route.ts` | 59 |
| `src/app/api/agent/approval-gates/route.ts` | 50 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 33 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 33 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 25 |
| `src/app/api/auth/users/[id]/route.ts` | 23 |
| `src/app/api/drafts/[id]/route.ts` | 23 |
| `src/app/api/ai/schema/[entity]/route.ts` | 22 |
| `src/app/api/assets3d/[id]/route.ts` | 22 |
| `src/app/api/cms/pages/[id]/route.ts` | 22 |

## Top App Pages by LOC

| Page | LOC |
| --- | ---: |
| `src/app/(frontend)/[...slug]/page.tsx` | 88 |
| `src/app/(frontend)/preview/[id]/page.tsx` | 67 |
| `src/app/(frontend)/page.tsx` | 50 |
| `src/app/(admin)/admin/agentcreator/teaching/page.tsx` | 48 |
| `src/app/(admin)/admin/agentcreator/page.tsx` | 45 |
| `src/app/(frontend)/kangur/login/page.tsx` | 35 |
| `src/app/(frontend)/kangur/(app)/[[...slug]]/page.tsx` | 28 |
| `src/app/(frontend)/preview/foldertree-shell-runtime/page.tsx` | 21 |
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
| `src/app/(admin)/admin/kangur/[...slug]/page.tsx` | 13 |

## Recommended First Runtime Profiling Targets

- `src/app/api/v2/products/[[...path]]/route.ts`
- `src/app/api/v2/integrations/[[...path]]/route.ts`
- `src/app/api/image-studio/[[...path]]/route.ts`
- `src/app/api/ai-paths/[[...path]]/route.ts`
- `src/app/api/databases/[[...path]]/route.ts`
- `src/app/api/agentcreator/[[...path]]/route.ts`
- `src/app/api/chatbot/[[...path]]/route.ts`
- `src/app/api/agent/leases/route.ts`
- `src/app/api/kangur/[[...path]]/route.ts`
- `src/app/api/agent/resources/route.ts`
