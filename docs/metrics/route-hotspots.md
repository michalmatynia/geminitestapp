---
owner: 'Platform Team'
last_reviewed: '2026-03-30'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Route Hotspots (Static Heuristic)

Generated at: 2026-03-30T18:02:55.984Z

This report ranks route/page complexity using LOC as a fast heuristic baseline.

## Top API Routes by LOC

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 231 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 228 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 205 |
| `src/app/api/databases/[[...path]]/route.ts` | 203 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 168 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 167 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 126 |
| `src/app/api/kangur/[[...path]]/route.ts` | 62 |
| `src/app/api/marketplace/[resource]/route.ts` | 38 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 32 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 32 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 25 |
| `src/app/api/cms/slugs/[id]/route.ts` | 24 |
| `src/app/api/auth/roles/route.ts` | 23 |
| `src/app/api/auth/users/[id]/route.ts` | 23 |
| `src/app/api/drafts/[id]/route.ts` | 23 |
| `src/app/api/kangur/auth/me/route.ts` | 23 |
| `src/app/api/ai/schema/[entity]/route.ts` | 22 |
| `src/app/api/assets3d/[id]/route.ts` | 22 |
| `src/app/api/cms/pages/[id]/route.ts` | 22 |

## Top App Pages by LOC

| Page | LOC |
| --- | ---: |
| `src/app/(admin)/admin/agentcreator/teaching/page.tsx` | 48 |
| `src/app/(admin)/admin/agentcreator/page.tsx` | 45 |
| `src/app/(frontend)/preview/[id]/page.tsx` | 40 |
| `src/app/[locale]/(frontend)/[...slug]/page.tsx` | 35 |
| `src/app/(frontend)/[...slug]/page.tsx` | 32 |
| `src/app/(admin)/admin/products/settings/page.tsx` | 29 |
| `src/app/[locale]/(frontend)/login/page.tsx` | 29 |
| `src/app/(admin)/admin/filemaker/campaigns/preferences/page.tsx` | 24 |
| `src/app/(admin)/admin/filemaker/campaigns/unsubscribe/page.tsx` | 24 |
| `src/app/(frontend)/preview/foldertree-shell-runtime/page.tsx` | 21 |
| `src/app/[locale]/(frontend)/kangur/login/page.tsx` | 20 |
| `src/app/[locale]/(frontend)/page.tsx` | 18 |
| `src/app/(admin)/admin/integrations/aggregators/base-com/synchronization-engine/page.tsx` | 17 |
| `src/app/[locale]/(frontend)/products/[id]/page.tsx` | 17 |
| `src/app/(admin)/admin/kangur/[...slug]/page.tsx` | 16 |
| `src/app/(frontend)/kangur/login/page.tsx` | 16 |
| `src/app/(frontend)/login/page.tsx` | 16 |
| `src/app/(admin)/admin/ai-paths/queue/page.tsx` | 15 |
| `src/app/(frontend)/products/[id]/page.tsx` | 15 |
| `src/app/(admin)/admin/chatbot/context/page.tsx` | 14 |

## Recommended First Runtime Profiling Targets

- `src/app/api/v2/integrations/[[...path]]/route.ts`
- `src/app/api/agentcreator/[[...path]]/route.ts`
- `src/app/api/ai-paths/[[...path]]/route.ts`
- `src/app/api/databases/[[...path]]/route.ts`
- `src/app/api/chatbot/[[...path]]/route.ts`
- `src/app/api/v2/products/[[...path]]/route.ts`
- `src/app/api/image-studio/[[...path]]/route.ts`
- `src/app/api/kangur/[[...path]]/route.ts`
- `src/app/api/marketplace/[resource]/route.ts`
- `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts`
