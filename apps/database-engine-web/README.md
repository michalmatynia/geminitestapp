---
owner: 'Platform Team'
last_reviewed: '2026-05-07'
status: 'active'
doc_type: 'overview'
scope: 'workspace:@app/database-engine-web'
canonical: true
---

# Database Web Workspace

`apps/database-engine-web` is a standalone Next.js workspace for the database
admin application. It follows the same application split pattern as
`apps/studiq-web` and `apps/cms-builder-web`: the app runs from its own
workspace, loads repo-root `.env*` files, and reuses repo-root modules through
aliases.

## Workspace Role

- Serves the database admin surface at `/admin/databases/*`.
- Owns backups at `/admin/databases` and `/admin/databases/backups`.
- Owns operations and CRUD pages at `/admin/databases/operations` and
  `/admin/databases/crud`.
- Owns the database control panel at `/admin/databases/control-panel`.
- Owns the Engine and preview workspaces at `/admin/databases/engine` and
  `/admin/databases/preview`.
- Owns local sign-in/register pages and NextAuth route endpoints for this app.
- Reuses the current Database Engine implementation from `src/features/database`.
- Owns local route wrappers for database, auth, settings, client error, and
  query telemetry APIs.
- Reuses shared handler implementations where the root app and standalone app
  still need the same database orchestration code.
- Keeps shared database services in the repo root so the engine can still manage
  geminitestapp, StudiQ, and CMS Builder sources together.

## Common Commands

| Command | Effect |
| --- | --- |
| `npm run dev -w @app/database-engine-web` | Starts the Database Engine dev server on port `3400`. |
| `npm run build -w @app/database-engine-web` | Builds the standalone Database Engine workspace. |
| `npm run start -w @app/database-engine-web` | Starts the built workspace on port `3400`. |
| `npm run test -w @app/database-engine-web` | Runs Database Engine workspace tests. |
| `npm run typecheck -w @app/database-engine-web` | Runs TypeScript checks for this workspace. |

Root shortcuts are also available:

| Command | Equivalent |
| --- | --- |
| `npm run dev:database-engine` | `npm run dev -w @app/database-engine-web` |
| `npm run build:database-engine` | `npm run build -w @app/database-engine-web` |
| `npm run start:database-engine` | `npm run start -w @app/database-engine-web` |
| `npm run test:database-engine` | `npm run test -w @app/database-engine-web` |
| `npm run typecheck:database-engine` | `npm run typecheck -w @app/database-engine-web` |

## Root App Handoff

The root platform proxy can hand database admin page traffic to this separate
workspace by setting `DATABASE_ENGINE_WEB_ORIGIN` in the root app environment.
For local development, use:

```bash
DATABASE_ENGINE_WEB_ORIGIN=http://localhost:3400
```

When configured, root `/admin/databases/*` requests redirect to matching routes
in this workspace. API requests are not redirected; the standalone workspace
owns local route wrappers for the required `/api/databases/*`,
`/api/settings/*`, and auth endpoints.

## Current Boundary

The standalone app owns its page routes and database API route layer. Database
API handler implementations live under `src/features/database/server/api`, with
shared server contracts, backup orchestration, and sync helpers kept in the
database feature and shared database libraries.

## Related Docs

- [`../../docs/build/application-workspaces-and-commands.md`](../../docs/build/application-workspaces-and-commands.md)
- [`../cms-builder-web/README.md`](../cms-builder-web/README.md)
- [`../studiq-web/README.md`](../studiq-web/README.md)
