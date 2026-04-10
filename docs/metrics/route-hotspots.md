---
owner: 'Platform Team'
last_reviewed: '2026-04-10'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Route Hotspots (Static Heuristic)

Generated at: 2026-04-10T11:37:14.603Z

This report ranks route/page complexity using LOC as a fast heuristic baseline.

## Top API Routes by LOC

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 144 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 124 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 114 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 112 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 109 |
| `src/app/api/databases/[[...path]]/route.ts` | 100 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 80 |
| `src/app/api/kangur/[[...path]]/route.ts` | 60 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 30 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 30 |
| `src/app/api/user/preferences/route.ts` | 26 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 24 |
| `src/app/api/cms/slugs/[id]/route.ts` | 23 |
| `src/app/api/auth/users/[id]/route.ts` | 22 |
| `src/app/api/ai/schema/[entity]/route.ts` | 21 |
| `src/app/api/auth/roles/route.ts` | 21 |
| `src/app/api/drafts/[id]/route.ts` | 21 |
| `src/app/api/kangur/auth/me/route.ts` | 21 |
| `src/app/api/assets3d/[id]/route.ts` | 20 |

## Top App Pages by LOC

| Page | LOC |
| --- | ---: |
| `src/app/(admin)/admin/agentcreator/teaching/page.tsx` | 48 |
| `src/app/(admin)/admin/agentcreator/page.tsx` | 45 |
| `src/app/(frontend)/preview/[id]/page.tsx` | 38 |
| `src/app/[locale]/(frontend)/[...slug]/page.tsx` | 33 |
| `src/app/(frontend)/[...slug]/page.tsx` | 30 |
| `src/app/(admin)/admin/products/settings/page.tsx` | 29 |
| `src/app/[locale]/(frontend)/login/page.tsx` | 26 |
| `src/app/(admin)/admin/filemaker/campaigns/preferences/page.tsx` | 24 |
| `src/app/(admin)/admin/filemaker/campaigns/unsubscribe/page.tsx` | 24 |
| `src/app/[locale]/(frontend)/kangur/login/page.tsx` | 20 |
| `src/app/(frontend)/preview/foldertree-shell-runtime/page.tsx` | 19 |
| `src/app/(admin)/admin/integrations/aggregators/base-com/synchronization-engine/page.tsx` | 17 |
| `src/app/(admin)/admin/kangur/[...slug]/page.tsx` | 16 |
| `src/app/(frontend)/kangur/login/page.tsx` | 16 |
| `src/app/(admin)/admin/ai-paths/queue/page.tsx` | 15 |
| `src/app/[locale]/(frontend)/page.tsx` | 15 |
| `src/app/[locale]/(frontend)/products/[id]/page.tsx` | 15 |
| `src/app/(admin)/admin/3d-assets/list/page.tsx` | 13 |
| `src/app/(admin)/admin/3d-assets/page.tsx` | 13 |
| `src/app/(admin)/admin/chatbot/context/page.tsx` | 13 |

## Recommended First Runtime Profiling Targets

- `src/app/api/v2/integrations/[[...path]]/route.ts`
- `src/app/api/image-studio/[[...path]]/route.ts`
- `src/app/api/ai-paths/[[...path]]/route.ts`
- `src/app/api/v2/products/[[...path]]/route.ts`
- `src/app/api/agentcreator/[[...path]]/route.ts`
- `src/app/api/databases/[[...path]]/route.ts`
- `src/app/api/chatbot/[[...path]]/route.ts`
- `src/app/api/kangur/[[...path]]/route.ts`
- `src/app/api/marketplace/[resource]/route.ts`
- `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts`
