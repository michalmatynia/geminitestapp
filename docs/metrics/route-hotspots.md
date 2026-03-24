---
owner: 'Platform Team'
last_reviewed: '2026-03-24'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Route Hotspots (Static Heuristic)

Generated at: 2026-03-24T23:07:29.938Z

This report ranks route/page complexity using LOC as a fast heuristic baseline.

## Top API Routes by LOC

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 231 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 228 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 205 |
| `src/app/api/databases/[[...path]]/route.ts` | 203 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 168 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 161 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 126 |
| `src/app/api/agent/leases/route.ts` | 122 |
| `src/app/api/kangur/[[...path]]/route.ts` | 62 |
| `src/app/api/agent/resources/route.ts` | 59 |
| `src/app/api/agent/approval-gates/route.ts` | 50 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 33 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 33 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 25 |
| `src/app/api/cms/slugs/[id]/route.ts` | 24 |
| `src/app/api/auth/roles/route.ts` | 23 |
| `src/app/api/auth/users/[id]/route.ts` | 23 |
| `src/app/api/drafts/[id]/route.ts` | 23 |
| `src/app/api/kangur/auth/me/route.ts` | 23 |

## Top App Pages by LOC

| Page | LOC |
| --- | ---: |
| `src/app/[locale]/(frontend)/[...slug]/page.tsx` | 104 |
| `src/app/[locale]/(frontend)/page.tsx` | 87 |
| `src/app/(frontend)/[...slug]/page.tsx` | 82 |
| `src/app/(frontend)/page.tsx` | 62 |
| `src/app/[locale]/(frontend)/kangur/login/page.tsx` | 53 |
| `src/app/(admin)/admin/agentcreator/teaching/page.tsx` | 48 |
| `src/app/(admin)/admin/agentcreator/page.tsx` | 45 |
| `src/app/(frontend)/preview/[id]/page.tsx` | 40 |
| `src/app/(frontend)/kangur/login/page.tsx` | 37 |
| `src/app/[locale]/(frontend)/kangur/(app)/[[...slug]]/page.tsx` | 37 |
| `src/app/(admin)/admin/products/settings/page.tsx` | 29 |
| `src/app/(frontend)/kangur/(app)/[[...slug]]/page.tsx` | 28 |
| `src/app/(frontend)/preview/foldertree-shell-runtime/page.tsx` | 21 |
| `src/app/[locale]/(frontend)/products/[id]/page.tsx` | 20 |
| `src/app/(admin)/admin/ai-paths/queue/page.tsx` | 15 |
| `src/app/(frontend)/products/[id]/page.tsx` | 15 |
| `src/app/(admin)/admin/chatbot/context/page.tsx` | 14 |
| `src/app/(admin)/admin/chatbot/page.tsx` | 14 |
| `src/app/(admin)/admin/integrations/marketplaces/page.tsx` | 14 |
| `src/app/(admin)/admin/integrations/page.tsx` | 14 |

## Recommended First Runtime Profiling Targets

- `src/app/api/v2/integrations/[[...path]]/route.ts`
- `src/app/api/agentcreator/[[...path]]/route.ts`
- `src/app/api/ai-paths/[[...path]]/route.ts`
- `src/app/api/databases/[[...path]]/route.ts`
- `src/app/api/chatbot/[[...path]]/route.ts`
- `src/app/api/v2/products/[[...path]]/route.ts`
- `src/app/api/image-studio/[[...path]]/route.ts`
- `src/app/api/agent/leases/route.ts`
- `src/app/api/kangur/[[...path]]/route.ts`
- `src/app/api/agent/resources/route.ts`
