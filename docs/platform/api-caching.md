---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
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

- Route handlers can opt out of static optimization with
  `export const dynamic = 'force-dynamic'`.
- `Cache-Control: no-store` should be set on responses when downstream caches
  must not retain them.
- Prefer explicit cache policy over relying on framework defaults.

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

- inspect the route handler under `src/app/api/...`
- confirm headers in the response
- check related client query stale time and invalidation behavior

Use this document as policy. For exact current route behavior, inspect the
actual handler files rather than relying on old manual route tables.
