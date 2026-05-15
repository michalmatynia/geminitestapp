---
owner: 'Platform Team'
last_reviewed: '2026-05-15'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Route Hotspots (Static Heuristic)

Generated at: 2026-05-15T03:53:51.572Z

This report ranks route/page complexity using LOC as a fast heuristic baseline.

## Top API Routes by LOC

| Route | LOC |
| --- | ---: |
| `src/app/api/v2/integrations/[[...path]]/route.ts` | 160 |
| `src/app/api/v2/products/[[...path]]/route.ts` | 156 |
| `src/app/api/image-studio/[[...path]]/route.ts` | 124 |
| `src/app/api/agentcreator/[[...path]]/route.ts` | 115 |
| `src/app/api/ai-paths/[[...path]]/route.ts` | 104 |
| `src/app/api/chatbot/[[...path]]/route.ts` | 80 |
| `src/app/api/kangur/[[...path]]/route.ts` | 60 |
| `src/app/api/marketplace/[resource]/route.ts` | 37 |
| `src/app/api/settings/route.ts` | 37 |
| `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts` | 30 |
| `src/app/api/kangur/auth/parent-magic-link/request/route.ts` | 30 |
| `src/app/api/settings/google-oauth/route.ts` | 28 |
| `src/app/api/settings/lite/route.ts` | 27 |
| `src/app/api/user/preferences/route.ts` | 26 |
| `src/app/api/client-errors/route.ts` | 25 |
| `src/app/api/v2/metadata/[type]/[id]/route.ts` | 24 |
| `src/app/api/v2/metadata/[type]/route.ts` | 24 |
| `src/app/api/ai/schema/[entity]/route.ts` | 23 |
| `src/app/api/cms/slugs/[id]/route.ts` | 23 |
| `src/app/api/ai-insights/generate/session/route.ts` | 22 |

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
| `src/app/(admin)/admin/page-manager/studiq/[...slug]/page.tsx` | 21 |
| `src/app/(admin)/admin/kangur/builder/page.tsx` | 19 |
| `src/app/(frontend)/page.tsx` | 19 |
| `src/app/(frontend)/preview/foldertree-shell-runtime/page.tsx` | 19 |
| `src/app/(admin)/admin/integrations/aggregators/base-com/synchronization-engine/page.tsx` | 17 |
| `src/app/(admin)/admin/kangur/content-manager/page.tsx` | 17 |
| `src/app/(admin)/admin/kangur/observability/page.tsx` | 17 |
| `src/app/(admin)/admin/kangur/settings/ai-tutor-content/page.tsx` | 17 |
| `src/app/(admin)/admin/page.tsx` | 17 |
| `src/app/(admin)/admin/kangur/appearance/page.tsx` | 16 |
| `src/app/(admin)/admin/kangur/documentation/page.tsx` | 16 |

## Recommended First Runtime Profiling Targets

- `src/app/api/v2/integrations/[[...path]]/route.ts`
- `src/app/api/v2/products/[[...path]]/route.ts`
- `src/app/api/image-studio/[[...path]]/route.ts`
- `src/app/api/agentcreator/[[...path]]/route.ts`
- `src/app/api/ai-paths/[[...path]]/route.ts`
- `src/app/api/chatbot/[[...path]]/route.ts`
- `src/app/api/kangur/[[...path]]/route.ts`
- `src/app/api/marketplace/[resource]/route.ts`
- `src/app/api/settings/route.ts`
- `src/app/api/kangur/auth/parent-magic-link/exchange/route.ts`
