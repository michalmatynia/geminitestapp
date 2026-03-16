---
owner: 'Platform Team'
last_reviewed: '2026-03-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Route Hotspots (Static Heuristic)

Generated at: 2026-03-16T05:09:47.350Z

This report ranks route/page complexity using LOC as a fast heuristic baseline.

## Top API Routes by LOC

| Route | LOC |
| --- | ---: |
| `src/app/api/kangur/auth/[[...path]]/route.ts` | 163 |
| `src/app/api/kangur/learners/[[...id]]/route.ts` | 159 |
| `src/app/api/kangur/ai-tutor/[[...action]]/route.ts` | 154 |
| `src/app/api/kangur/assignments/[[...id]]/route.ts` | 125 |
| `src/app/api/agent/leases/route.ts` | 122 |
| `src/app/api/kangur/duels/[action]/route.ts` | 97 |
| `src/app/api/kangur/learner-activity/[[...action]]/route.ts` | 95 |
| `src/app/api/kangur/tts/[[...action]]/route.ts` | 94 |
| `src/app/api/chatbot/agent/[runId]/[action]/route.ts` | 83 |
| `src/app/api/kangur/knowledge-graph/[action]/route.ts` | 70 |
| `src/app/api/kangur/number-balance/[action]/route.ts` | 64 |
| `src/app/api/agent/resources/route.ts` | 59 |
| `src/app/api/agent/approval-gates/route.ts` | 50 |
| `src/app/api/v2/products/[id]/route.ts` | 42 |
| `src/app/api/v2/products/[id]/studio/[action]/route.ts` | 40 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/v2/products/metadata/[type]/[id]/route.ts` | 35 |
| `src/app/api/v2/products/metadata/[type]/route.ts` | 32 |
| `src/app/api/v2/products/sync/profiles/[id]/route.ts` | 30 |
| `src/app/api/v2/products/categories/[id]/route.ts` | 28 |

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
| `src/app/(frontend)/kangur/login/page.tsx` | 35 |
| `src/app/(admin)/admin/settings/logging/page.tsx` | 32 |
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

- `src/app/api/kangur/auth/[[...path]]/route.ts`
- `src/app/api/kangur/learners/[[...id]]/route.ts`
- `src/app/api/kangur/ai-tutor/[[...action]]/route.ts`
- `src/app/api/kangur/assignments/[[...id]]/route.ts`
- `src/app/api/agent/leases/route.ts`
- `src/app/api/kangur/duels/[action]/route.ts`
- `src/app/api/kangur/learner-activity/[[...action]]/route.ts`
- `src/app/api/kangur/tts/[[...action]]/route.ts`
- `src/app/api/chatbot/agent/[runId]/[action]/route.ts`
- `src/app/api/kangur/knowledge-graph/[action]/route.ts`
