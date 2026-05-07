---
owner: 'Kangur Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'overview'
scope: 'workspace:@app/studiq-web'
canonical: true
---

# StudiQ Web Workspace

`apps/studiq-web` is a standalone Next.js workspace focused on the StudiQ and
Kangur learner shell. It is the workspace behind
`npm run dev -w @app/studiq-web`.

## Workspace role

- Owns a focused web runtime for the StudiQ/Kangur learner-facing shell.
- Redirects `/` to `/kangur` and keeps the workspace centered on the Kangur
  storefront surface.
- Reuses repo-root source modules through aliases instead of forking a separate
  copy of shared features or contracts.
- Keeps the canonical public root app, admin routes, CMS routing, and most API
  handlers at the repository root.

## Runtime model

- The workspace runs Next.js from `apps/studiq-web`. It loads monorepo root
  `.env*` files first, then overlays `apps/studiq-web/.env*` so StudiQ can keep
  its own MongoDB database.
- `scripts/runtime/run-studiq-web-next.cjs` is the runtime wrapper used by the
  workspace `dev`, `build`, and `start` commands.
- The wrapper resolves the Next binary, sets `cwd` to `apps/studiq-web`, and
  forwards the requested command arguments to Next. It also normalizes StudiQ
  MongoDB source variables before shared server modules import the Mongo client.
- `apps/studiq-web/next.config.mjs` sets the Turbopack root to the monorepo
  root and aliases repo-root modules such as `@/features`, `@/shared`, and
  `@docs`.
- Shared Kangur packages are consumed through the workspace dependencies:
  `@kangur/contracts`, `@kangur/core`, `@kangur/api-client`, and
  `@kangur/platform`.

## Common commands

| Command | What it runs internally | Effect |
| --- | --- | --- |
| `npm run dev -w @app/studiq-web` | workspace `dev` -> `node ../../scripts/runtime/run-studiq-web-next.cjs dev --port 3100` | Starts the StudiQ web dev server on port `3100`. |
| `npm run build -w @app/studiq-web` | workspace `build` -> `node ../../scripts/runtime/run-studiq-web-next.cjs build` | Builds the standalone workspace for production. |
| `npm run start -w @app/studiq-web` | workspace `start` -> `node ../../scripts/runtime/run-studiq-web-next.cjs start --port 3100` | Starts the production server for the built workspace on port `3100`. |
| `npm run typecheck -w @app/studiq-web` | workspace `typecheck` -> `tsc -p tsconfig.json --noEmit --pretty false` | Runs TypeScript checks for the workspace-local config. |
| `npm run mongo:up -w @app/studiq-web` | workspace `mongo:up` -> `MONGODB_PORT=27018 node ../../scripts/db/local-mongo.mjs up` | Starts the dedicated local StudiQ MongoDB data directory. |
| `npm run mongo:down -w @app/studiq-web` | workspace `mongo:down` -> `MONGODB_PORT=27018 node ../../scripts/db/local-mongo.mjs down` | Stops the dedicated local StudiQ MongoDB process. |
| `npm run mongo:status -w @app/studiq-web` | workspace `mongo:status` -> `MONGODB_PORT=27018 node ../../scripts/db/local-mongo.mjs status` | Checks the dedicated local StudiQ MongoDB process. |
| `npm run mongo:copy-from-root:plan -w @app/studiq-web` | workspace copy plan -> `node ../../scripts/db/copy-studiq-local-mongo.mjs` | Counts root Kangur/StudiQ MongoDB documents that would be copied. |
| `npm run mongo:copy-from-root -w @app/studiq-web` | workspace copy apply -> `node ../../scripts/db/copy-studiq-local-mongo.mjs --apply` | Copies root Kangur/StudiQ MongoDB documents into `studiq_local`. |
| `npm run mongo:detach-root:plan -w @app/studiq-web` | workspace detach plan -> `node ../../scripts/db/detach-studiq-root-mongo.mjs` | Counts root Kangur/StudiQ MongoDB documents that would be removed after the local copy is verified. |
| `npm run mongo:detach-root -w @app/studiq-web` | workspace detach apply -> `node ../../scripts/db/detach-studiq-root-mongo.mjs --apply --confirm=detach-studiq-from-root` | Removes copied StudiQ/Kangur documents from the root local MongoDB database. |
| `npm run mongo:restore-root:plan -w @app/studiq-web` | workspace restore plan -> `node ../../scripts/db/restore-studiq-root-mongo.mjs` | Reads the latest detach backup and counts root documents that would be restored. |
| `npm run mongo:restore-root -w @app/studiq-web` | workspace restore apply -> `node ../../scripts/db/restore-studiq-root-mongo.mjs --apply --confirm=restore-studiq-root` | Restores backed-up StudiQ/Kangur documents into the root local MongoDB database. |

## Local MongoDB

`apps/studiq-web/.env.local` points the workspace at
`mongodb://127.0.0.1:27018/studiq_local`, with `MONGODB_ACTIVE_SOURCE_DEFAULT`
forced to `local`. That file is ignored by git; `apps/studiq-web/.env.example`
contains the checked-in template.

The local data directory is `apps/studiq-web/mongo/local-data`. Start it before
running the StudiQ dev server:

```bash
npm run mongo:up -w @app/studiq-web
npm run mongo:copy-from-root -w @app/studiq-web
npm run mongo:detach-root:plan -w @app/studiq-web
npm run dev -w @app/studiq-web
```

`mongo:detach-root` is intentionally separate from the copy step because it
deletes data from the root local MongoDB database. Run the plan first; the apply
script writes an Extended JSON backup under
`apps/studiq-web/mongo/runtime/root-detach-backups` before deleting the exact
backed-up root documents.

After root data is detached, `mongo:copy-from-root` refuses to replace an
initialized `studiq_local` database from an empty root source unless an explicit
override flag is supplied to the underlying script. This prevents accidental
target data loss on repeat migration runs.

`mongo:restore-root:plan` uses the latest detach backup by default. To inspect a
specific backup snapshot, pass `-- --backup-dir=/absolute/path/to/snapshot`.

## When to use this workspace

- Use `npm run dev -w @app/studiq-web` when you want an isolated StudiQ/Kangur
  web shell and do not need the full root admin or CMS runtime.
- Use `npm run dev` at the repository root when you need the canonical root
  Next.js app with the broader public, admin, and API surface.
- Use `npm run dev:mobile` or `npm run dev -w @kangur/mobile` when you are
  working on the Expo native app rather than the web shell.

## Current route shape

- `src/app/page.tsx` redirects `/` to `/kangur`.
- `src/app/kangur/*` owns the focused Kangur shell layout, loading, and error
  boundaries.
- `src/app/[locale]/page.tsx` provides localized entry handling for the
  workspace.

## Known boundaries

- This workspace does not replace the repository-root Next.js app as the
  canonical owner of admin routes, CMS composition, or the main API surface.
- It is intentionally thinner than the root app and leans on repo-root source
  aliases for most shared behavior.
- If you change shared Kangur contracts or root source modules, validate both
  this workspace and the root app.
- In the split Vercel setup, this project should receive only StudiQ/Kangur
  web traffic. CMS domains and `/admin/cms/*` belong to
  `apps/cms-builder-web`; `CMS_WEB_ORIGIN` is a root-platform proxy setting,
  not a StudiQ workspace setting.

## Related docs

- [`../../README.md`](../../README.md)
- [`../../docs/build/application-workspaces-and-commands.md`](../../docs/build/application-workspaces-and-commands.md)
- [`../../docs/build/vercel-studiq-cms-split.md`](../../docs/build/vercel-studiq-cms-split.md)
- [`../../docs/kangur/studiq-application.md`](../../docs/kangur/studiq-application.md)
- [`../mobile/README.md`](../mobile/README.md)
- [`../mobile-web/README.md`](../mobile-web/README.md)
