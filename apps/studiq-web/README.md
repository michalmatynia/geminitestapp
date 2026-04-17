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

- The workspace runs Next.js from `apps/studiq-web`, but it loads `.env*` files
  from the monorepo root.
- `scripts/runtime/run-studiq-web-next.cjs` is the runtime wrapper used by the
  workspace `dev`, `build`, and `start` commands.
- The wrapper resolves the Next binary, sets `cwd` to `apps/studiq-web`, and
  forwards the requested command arguments to Next.
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

## Related docs

- [`../../README.md`](../../README.md)
- [`../../docs/build/application-workspaces-and-commands.md`](../../docs/build/application-workspaces-and-commands.md)
- [`../../docs/kangur/studiq-application.md`](../../docs/kangur/studiq-application.md)
- [`../mobile/README.md`](../mobile/README.md)
- [`../mobile-web/README.md`](../mobile-web/README.md)
