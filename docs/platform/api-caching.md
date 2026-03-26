---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'policy'
scope: 'platform'
canonical: true
---

# API Caching Strategy

This document describes the current server-side caching policy for route
handlers under `src/app/api/`.

## Principles

- Use `no-store` / `force-dynamic` for security-sensitive, user-specific, or
  operationally live data.
- Use `revalidate` for semi-static data where bounded staleness is acceptable.
- Use long-lived caching only for effectively static metadata.
- Make the route’s caching decision explicit when freshness matters to product
  behavior, debugging, or security.

## Routes That Should Usually Be Dynamic

- auth/session/user routes
- settings/provider routing routes
- system logs, system activity, diagnostics
- AI run/job/session state
- database browse/backup/restore operations
- external search or provider-backed live lookups

These routes should avoid stale responses in both Next.js and downstream caches.

## Routes That Can Usually Revalidate

- product list/detail APIs
- CMS/public content APIs
- file/media listing APIs
- taxonomies and catalog metadata
- selected image-studio/project views

Choose revalidation windows based on product tolerance for staleness rather than
copying a single default everywhere.

## Routes That Can Usually Be Long-Lived

- countries
- languages
- currencies
- structural metadata with very low change frequency

## Implementation Notes

- Route segment config such as `runtime`, `dynamic`, and `revalidate` must be
  declared directly in `route.ts`. Do not re-export those fields from
  `handler.ts` or `route-handler.ts`.
- App API route files should export HTTP methods through `apiHandler` or
  `apiHandlerWithParams`; keep the heavy implementation in sibling
  `handler.ts` / `route-handler.ts` files.
- Route handlers can opt out of static optimization with
  `export const dynamic = 'force-dynamic'`.
- `Cache-Control: no-store` should be set on responses when downstream caches
  must not retain them.
- Some routes intentionally combine route-level segment config with explicit
  `cacheControl` wrapper options or response headers. Inspect both the route
  file and the handler implementation before changing policy.
- Prefer explicit cache policy over relying on framework defaults.

Examples in the current tree:

- Dynamic authenticated route:
  [`src/app/api/system/logs/route.ts`](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/src/app/api/system/logs/route.ts)
- Dynamic authenticated file listing route with explicit revalidation:
  [`src/app/api/files/route.ts`](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/src/app/api/files/route.ts)
- Long-lived metadata route with explicit cache-control:
  [`src/app/api/v2/metadata/[type]/route.ts`](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/src/app/api/v2/metadata/[type]/route.ts)

Example:

```ts
export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await fetchData();
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
```

## Verification

- inspect `route.ts` under `src/app/api/...` for `runtime`, `dynamic`, and
  `revalidate`
- inspect sibling `handler.ts` / `route-handler.ts` and wrapper options for
  response headers or explicit `cacheControl`
- confirm headers in the response
- check related client query stale time and invalidation behavior
- run `npm run check:route-policies`
- run `npm run check:next-route-config-reexports`

Use this document as policy. For exact current route behavior, inspect the
actual handler files rather than relying on old manual route tables.
