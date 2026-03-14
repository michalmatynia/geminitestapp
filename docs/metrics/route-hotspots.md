---
owner: 'Platform Team'
last_reviewed: '2026-03-14'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Route Hotspots (Static Heuristic)

Generated at: 2026-03-14T10:34:03.114Z

This report ranks route/page complexity using LOC as a fast heuristic baseline.

## Top API Routes by LOC

| Route | LOC |
| --- | ---: |
| `src/app/api/agent/leases/route.ts` | 119 |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 83 |
| `src/app/api/agent/resources/route.ts` | 59 |
| `src/app/api/agent/approval-gates/route.ts` | 50 |
| `src/app/api/v2/products/[id]/route.ts` | 42 |
| `src/app/api/v2/products/[id]/studio/[action]/route.ts` | 40 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/v2/products/metadata/[type]/[id]/route.ts` | 35 |
| `src/app/api/v2/products/metadata/[type]/route.ts` | 32 |
| `src/app/api/v2/products/sync/profiles/[id]/route.ts` | 30 |
| `src/app/api/kangur/ai-tutor/content/route.ts` | 29 |
| `src/app/api/kangur/ai-tutor/native-guide/route.ts` | 29 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 28 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 28 |
| `src/app/api/v2/products/categories/[id]/route.ts` | 28 |
| `src/app/api/v2/products/entities/[type]/[id]/route.ts` | 28 |
| `src/app/api/chatbot/sessions/route.ts` | 27 |
| `src/app/api/v2/products/categories/route.ts` | 26 |
| `src/app/api/v2/products/parameters/route.ts` | 26 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 25 |

## Top App Pages by LOC

| Page | LOC |
| --- | ---: |
| `src/app/(frontend)/[...slug]/page.tsx` | 86 |
| `src/app/(frontend)/preview/[id]/page.tsx` | 67 |
| `src/app/(admin)/admin/settings/recovery/page.tsx` | 50 |
| `src/app/(admin)/admin/agentcreator/teaching/page.tsx` | 48 |
| `src/app/(frontend)/page.tsx` | 48 |
| `src/app/(admin)/admin/agentcreator/page.tsx` | 45 |
| `src/app/(admin)/admin/page.tsx` | 40 |
| `src/app/(admin)/admin/settings/logging/page.tsx` | 32 |
| `src/app/(frontend)/kangur/login/page.tsx` | 32 |
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

## Recommended First Runtime Profiling Targets

- `src/app/api/agent/leases/route.ts`
- `src/app/api/chatbot/agent/[runId]/[action]/route.ts`
- `src/app/api/agent/resources/route.ts`
- `src/app/api/agent/approval-gates/route.ts`
- `src/app/api/v2/products/[id]/route.ts`
- `src/app/api/v2/products/[id]/studio/[action]/route.ts`
- `src/app/api/marketplace/[resource]/route.ts`
- `src/app/api/v2/products/metadata/[type]/[id]/route.ts`
- `src/app/api/v2/products/metadata/[type]/route.ts`
- `src/app/api/v2/products/sync/profiles/[id]/route.ts`
