---
owner: 'Platform Team'
last_reviewed: '2026-03-16'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Route Hotspots (Static Heuristic)

Generated at: 2026-03-16T10:48:49.394Z

This report ranks route/page complexity using LOC as a fast heuristic baseline.

## Top API Routes by LOC

| Route | LOC |
| --- | ---: |
| `src/app/api/kangur/[[...path]]/route.ts` | 874 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 357 |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 275 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 254 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 232 |
| `src/app/api/databases/[[...path]]/route.ts` | 189 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 187 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 148 |
| `src/app/api/agent/leases/route.ts` | 122 |
| `src/app/api/agent/resources/route.ts` | 59 |
| `src/app/api/agent/approval-gates/route.ts` | 50 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 25 |
| `src/app/api/auth/users/[id]/route.ts` | 23 |
| `src/app/api/drafts/[id]/route.ts` | 23 |
| `src/app/api/ai/schema/[entity]/route.ts` | 22 |
| `src/app/api/assets3d/[id]/route.ts` | 22 |
| `src/app/api/cms/pages/[id]/route.ts` | 22 |
| `src/app/api/system/logs/route.ts` | 22 |
| `src/app/api/cms/slugs/[id]/route.ts` | 21 |

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

- `src/app/api/kangur/[[...path]]/route.ts`
- `src/app/api/v2/products/[[...path]]/route.ts`
- `src/app/api/v2/integrations/[[...path]]/route.ts`
- `src/app/api/image-studio/[[...path]]/route.ts`
- `src/app/api/ai-paths/[[...path]]/route.ts`
- `src/app/api/databases/[[...path]]/route.ts`
- `src/app/api/agentcreator/[[...path]]/route.ts`
- `src/app/api/chatbot/[[...path]]/route.ts`
- `src/app/api/agent/leases/route.ts`
- `src/app/api/agent/resources/route.ts`
