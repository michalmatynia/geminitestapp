---
owner: 'Platform Team'
last_reviewed: '2026-05-06'
status: 'active'
doc_type: 'overview'
scope: 'workspace:@app/cms-builder-web'
canonical: true
---

# CMS Builder Web Workspace

`apps/cms-builder-web` is a standalone Next.js workspace for the CMS builder
and CMS management surface. It follows the same workspace pattern as
`apps/studiq-web`: the app runs from `apps/cms-builder-web`, loads `.env*`
from the monorepo root, and reuses repo-root source modules through aliases.

## Workspace Role

- Owns a focused runtime for CMS management and the visual page builder.
- Serves public CMS pages at `/`, arbitrary CMS slugs, and locale-prefixed CMS
  routes.
- Serves the CMS admin surface at `/admin/cms/*`.
- Provides convenience redirects from `/cms/*` to `/admin/cms/*`.
- Owns the CMS app sign-in/register pages and NextAuth route endpoints.
- Reuses the current CMS implementation from `src/features/cms`.
- Reuses CMS, auth, settings, client error, query telemetry, and files route
  handlers from the repo-root app.

## Common Commands

| Command | Effect |
| --- | --- |
| `npm run dev -w @app/cms-builder-web` | Starts the CMS Builder dev server on port `3200`. |
| `npm run build -w @app/cms-builder-web` | Builds the standalone CMS Builder workspace. |
| `npm run start -w @app/cms-builder-web` | Starts the built workspace on port `3200`. |
| `npm run test -w @app/cms-builder-web` | Runs CMS Builder workspace tests. |
| `npm run typecheck -w @app/cms-builder-web` | Runs TypeScript checks for this workspace. |

Root shortcuts are also available:

| Command | Equivalent |
| --- | --- |
| `npm run dev:cms-builder` | `npm run dev -w @app/cms-builder-web` |
| `npm run build:cms-builder` | `npm run build -w @app/cms-builder-web` |
| `npm run start:cms-builder` | `npm run start -w @app/cms-builder-web` |
| `npm run test:cms-builder` | `npm run test -w @app/cms-builder-web` |
| `npm run typecheck:cms-builder` | `npm run typecheck -w @app/cms-builder-web` |

## Current Boundary

This first migration keeps `src/features/cms` as the shared implementation
package because other server features still import CMS services. The new app
owns a separate deployment/runtime surface first; a later cleanup can extract
route helpers or split CMS code into a package if that becomes useful.

The workspace has its own `/auth/signin`, `/auth/register`, `/api/auth/*`, and
proxy boundary. Anonymous `/admin/cms/*` requests redirect to the local sign-in
page, authenticated requests reuse the existing root auth callbacks and inject
the admin session header used by shared API handlers.

The public CMS routes intentionally ignore the root app's `front_page_app`
selection. This lets the root Vercel project render StudiQ while the CMS Vercel
project continues to render CMS pages from the same database.

The root platform proxy can hand CMS page traffic to a separate CMS deployment
by setting `CMS_WEB_ORIGIN`. When configured, `/admin/cms/*` and `/cms/*` in the
root app redirect to this workspace origin. `CMS_BUILDER_WEB_ORIGIN` is still
accepted as a compatibility alias.

For public CMS pages, attach CMS domains directly to the CMS Vercel project.
If traffic still reaches the root project during migration, set
`CMS_PUBLIC_HOSTS` or `CMS_PUBLIC_PATH_PREFIXES` in the root project to redirect
explicitly matched page requests to `CMS_WEB_ORIGIN`.

`npm run test -w @app/cms-builder-web` covers the CMS Builder proxy contract,
statically checks that CMS Builder runtime API paths discovered in reused
CMS/auth/settings modules have matching local route files, and verifies the
workspace contains every CMS admin and public page route required for the CMS
deployment.

## Related Docs

- [`../../docs/build/application-workspaces-and-commands.md`](../../docs/build/application-workspaces-and-commands.md)
- [`../../docs/build/vercel-studiq-cms-split.md`](../../docs/build/vercel-studiq-cms-split.md)
- [`../studiq-web/README.md`](../studiq-web/README.md)
