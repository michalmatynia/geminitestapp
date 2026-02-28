# Data Fetching and Caching Audit (2026-02-12)

This document outlines the explicit caching semantics chosen for the various data fetching paths in the application.

## Caching Strategies

We use three primary caching semantics provided by Next.js:

1.  **`no-store`**: Data is fetched on every request. Used for highly dynamic, sensitive, or user-specific data.
2.  **`force-cache`**: Data is cached indefinitely until manually invalidated. Used for static metadata.
3.  **`next.revalidate`**: Data is cached for a specific duration (in seconds). Used for semi-static content.

---

## API Route Audit

### 1. Dynamic Data (`no-store`)

These routes handle data that changes frequently or is specific to the authenticated user.

| Path                             | Rationale                                                        |
| :------------------------------- | :--------------------------------------------------------------- |
| `/api/chatbot/*`                 | Chat messages and sessions are highly dynamic and user-specific. |
| `/api/auth/*`                    | Session and user data must always be fresh for security.         |
| `/api/analytics/*`               | Event logs and summaries need to reflect the latest data.        |
| `/api/search/*`                  | Search results depend on the query and must be fresh.            |
| `/api/ai-paths/runs/*`           | Run statuses and logs are real-time.                             |
| `/api/system/*`                  | Health checks and system diagnostics must be real-time.          |
| `/api/settings` (with `debug=1`) | Debug info must never be cached.                                 |

### 2. Semi-Static Content (`next.revalidate`)

These routes handle content that changes occasionally but can tolerate some staleness for performance gains.

| Path                  | Revalidate | Rationale                                                                    |
| :-------------------- | :--------- | :--------------------------------------------------------------------------- |
| `/api/products`       | 60s        | Product listings are frequently updated but benefit from a short cache.      |
| `/api/notes`          | 60s        | Personal notes are updated by the user, but a short cache helps performance. |
| `/api/cms/pages`      | 300s       | CMS pages change less frequently than products.                              |
| `/api/cms/blocks`     | 300s       | CMS components are reused across pages.                                      |
| `/api/assets3d`       | 60s        | 3D asset metadata is semi-static.                                            |
| `/api/settings` (GET) | 120s       | App settings are cached with a background revalidation.                      |

### 3. Static Metadata (`force-cache`)

These routes handle data that rarely, if ever, changes.

| Path              | Revalidate | Rationale                                         |
| :---------------- | :--------- | :------------------------------------------------ |
| `/api/languages`  | 3600s      | Available languages are almost static.            |
| `/api/countries`  | 3600s      | Country lists are static.                         |
| `/api/currencies` | 3600s      | Currency definitions change very rarely.          |
| `/api/catalogs`   | 600s       | Product catalogs are mostly static configuration. |

---

## Client-Side Caching (TanStack Query)

While the API routes provide the server-side caching semantics, the client-side uses TanStack Query with its own `staleTime` and `gcTime` settings.

- **Standard fresh data**: `staleTime: 5 * 60 * 1000` (5 minutes).
- **Real-time data**: `staleTime: 0`.
- **Long-term data**: `staleTime: 60 * 60 * 1000` (1 hour).

## Manual Invalidation

When a `POST`, `PUT`, `PATCH`, or `DELETE` request is made to a route, we use the following mechanisms to invalidate the cache:

1.  **Server-side**: `revalidatePath` or `revalidateTag` (if using Next.js cache).
2.  **Client-side**: Centralized invalidation helpers from `src/shared/lib/query-invalidation.ts`.
