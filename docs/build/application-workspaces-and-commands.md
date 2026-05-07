---
owner: 'Platform Team'
last_reviewed: '2026-05-07'
status: 'active'
doc_type: 'reference'
scope: 'cross-feature'
canonical: true
---

# Application Workspaces And Commands

This reference explains which runtime command starts which application surface
in this repository, and what npm workspace-targeted commands such as
`npm run dev -w @app/studiq-web` actually do.

## Workspace Command Semantics

- `npm run <script> -w <workspace>` runs `<script>` from that workspace's
  `package.json`.
- `npm run --workspace <workspace> <script>` is the same operation with the
  longer flag form.
- Root aliases such as `npm run dev:mobile` are convenience wrappers around
  workspace commands; they do not define a separate application surface.

Example:

- `npm run dev -w @app/studiq-web` runs the `dev` script declared in
  `apps/studiq-web/package.json`.
- In this repo, that script is
  `node ../../scripts/runtime/run-studiq-web-next.cjs dev --port 3100`.
- The wrapper loads repo-root `.env*` files, changes the working directory to
  `apps/studiq-web`, and then starts the Next.js dev server for that workspace.

## Application Surface Map

| Surface | Location | Canonical command | What it does |
| --- | --- | --- | --- |
| Root platform app | repository root | `npm run dev` | Runs `node --max-old-space-size=8192 server.cjs` and starts the main Next.js web, admin, and API application. Default port is `3000` unless `PORT` is overridden. |
| Root platform app alias | repository root | `npm run dev:web` | Alias for the same root Next.js runtime as `npm run dev`. |
| Standalone StudiQ web workspace | `apps/studiq-web` / `@app/studiq-web` | `npm run dev -w @app/studiq-web` | Runs the workspace `dev` script and starts the focused StudiQ/Kangur Next.js shell on port `3100`. |
| Standalone CMS Builder workspace | `apps/cms-builder-web` / `@app/cms-builder-web` | `npm run dev -w @app/cms-builder-web` | Runs the workspace `dev` script and starts the focused CMS Builder Next.js shell on port `3200`. |
| Standalone ecommerce workspace | `apps/ecom-web` / `@app/ecom-web` | `npm run dev -w @app/ecom-web` | Runs the workspace `dev` script and starts the ARCANA ecommerce Next.js storefront on port `3300`. |
| Standalone database admin workspace | `apps/database-engine-web` / `@app/database-engine-web` | `npm run dev -w @app/database-engine-web` | Runs the workspace `dev` script and starts the focused database admin shell on port `3400`. |
| Kangur mobile | `apps/mobile` / `@kangur/mobile` | `npm run dev:mobile` | Delegates to `npm run dev --workspace @kangur/mobile`, which runs Expo through the shared mobile env wrapper. |
| Kangur mobile direct workspace entry | `apps/mobile` / `@kangur/mobile` | `npm run dev -w @kangur/mobile` | Starts the same Expo development server as `npm run dev:mobile`, but by targeting the workspace directly. |
| Kangur mobile web preview | `apps/mobile` / `@kangur/mobile` | `npm run dev:mobile:web` | Delegates to `npm run web --workspace @kangur/mobile` and starts Expo's web preview for the mobile shell. |
| Reserved mobile-web workspace | `apps/mobile-web` | no active runtime command | This workspace is currently documentation-only and does not own a live app runtime. |

## Workspace-Specific Runtime Notes

### Root Platform App

- Owns the canonical public web shell, CMS routing, admin routes, and API
  routes.
- Starts through `server.cjs`, which bootstraps Next.js and additional runtime
  concerns such as websocket upgrade routing.
- Use this when you need the full repo-root application surface, not just the
  Kangur/StudiQ learner shell.

### `@app/studiq-web`

- Owns a focused standalone Next.js shell under `apps/studiq-web`.
- Redirects `/` to `/kangur`.
- Loads repo-root environment files in both the runtime wrapper and
  `apps/studiq-web/next.config.mjs`, so the root `.env*` files remain the
  source of truth.
- Reuses repo-root code through aliases for `@/app`, `@/features`,
  `@/shared`, `@/server`, and `@docs`.
- Use this when you want an isolated StudiQ/Kangur web workspace without the
  root app's broader admin and CMS surface.

### `@app/cms-builder-web`

- Owns a focused standalone Next.js shell under `apps/cms-builder-web`.
- Owns the public CMS storefront/runtime at `/`, `/*`, `/{locale}`, and
  `/{locale}/*`.
- Serves the CMS admin surface at `/admin/cms/*` and canonicalizes `/cms/*` to
  `/admin/cms/*`.
- Owns the local CMS Builder auth pages, NextAuth route endpoints, session
  provider, CSRF provider, and `/admin/cms/*` proxy protection.
- Can receive root-platform CMS traffic when `CMS_WEB_ORIGIN` is configured in
  the root app environment. `CMS_BUILDER_WEB_ORIGIN` remains supported as a
  compatibility alias for the admin/builder handoff.
- Public CMS pages should normally be moved by attaching their domains directly
  to the CMS Vercel project. For transition cases where traffic still reaches
  the root project, `CMS_PUBLIC_HOSTS` and `CMS_PUBLIC_PATH_PREFIXES` can
  explicitly redirect matching public page requests to `CMS_WEB_ORIGIN`.
- Loads repo-root environment files in both the runtime wrapper and
  `apps/cms-builder-web/next.config.mjs`, so the root `.env*` files remain the
  source of truth.
- Reuses repo-root code through aliases for `@/app`, `@/features`,
  `@/shared`, `@/server`, `@/i18n`, and `@docs`.
- Use this when you want an isolated CMS Builder workspace without running the
  full root platform app.

### `@app/ecom-web`

- Owns a focused standalone ecommerce storefront under `apps/ecom-web`.
- Serves the ARCANA storefront at `/`, product detail pages under
  `/products/[slug]`, collection pages under `/collections/[slug]`, checkout,
  wishlist, account, editorial, contact, and `/api/products`.
- Uses workspace-local source through the `@/*` alias, with ecommerce data and
  state isolated under `apps/ecom-web/src`.
- Reads Mentios catalog products from MongoDB when `MONGODB_URI` is configured
  and falls back to static demo products when the database is unavailable or
  empty.
- Uses port `3300` so it can run beside the CMS Builder workspace on `3200`.
- Use this when you want to develop the ecommerce storefront without running
  the root platform app or CMS Builder workspace.

### `@app/database-engine-web`

- Owns a focused standalone database admin shell under
  `apps/database-engine-web`.
- Serves backups, operations, CRUD, control panel, preview, and Engine pages at
  `/admin/databases/*`.
- Owns the local Database Engine auth pages, NextAuth route endpoints, session
  provider, CSRF provider, and `/admin/databases/*` proxy protection.
- Owns `/api/databases/*` route wrappers; database API implementations live
  under `src/features/database/server/api`.
- Can receive root-platform database admin traffic when
  `DATABASE_ENGINE_WEB_ORIGIN` is configured in the root app environment.
- Loads repo-root environment files in both the runtime wrapper and
  `apps/database-engine-web/next.config.mjs`, so the root `.env*` files remain
  the source of truth.
- Reuses repo-root code through aliases for `@/app`, `@/features`,
  `@/shared`, `@/server`, `@/i18n`, and `@docs`.
- Uses port `3400` so it can run beside the ecommerce workspace on `3300`.
- Use this when you want an isolated Database Engine workspace without running
  the full root platform app.

### `@kangur/mobile`

- Owns the Expo Router native learner app.
- Uses `scripts/mobile/run-with-mobile-env.ts` to load mobile env files, apply
  Android SDK defaults, and then launch Expo or the mobile helper scripts.
- `npm run dev:mobile:web` is a validation path for the native shell, not a
  replacement for the root Next.js web app.

### `apps/mobile-web`

- Reserved for a future dedicated React Native Web or Expo web target.
- Do not treat it as the canonical web runtime unless the routing and
  deployment ownership docs are updated to say so.

## Common Command Shortcuts

| Goal | Preferred command | Equivalent direct workspace command |
| --- | --- | --- |
| Start the full root web/admin/API app | `npm run dev` | not applicable |
| Start the standalone StudiQ web workspace | `npm run dev -w @app/studiq-web` | `npm run --workspace @app/studiq-web dev` |
| Build the standalone StudiQ web workspace | `npm run build -w @app/studiq-web` | `npm run --workspace @app/studiq-web build` |
| Start the standalone CMS Builder workspace | `npm run dev:cms-builder` | `npm run dev -w @app/cms-builder-web` |
| Build the standalone CMS Builder workspace | `npm run build:cms-builder` | `npm run build -w @app/cms-builder-web` |
| Test the standalone CMS Builder workspace | `npm run test:cms-builder` | `npm run test -w @app/cms-builder-web` |
| Start the standalone ecommerce workspace | `npm run dev:ecom` | `npm run dev -w @app/ecom-web` |
| Build the standalone ecommerce workspace | `npm run build:ecom` | `npm run build -w @app/ecom-web` |
| Typecheck the standalone ecommerce workspace | `npm run typecheck:ecom` | `npm run typecheck -w @app/ecom-web` |
| Start the standalone Database Engine workspace | `npm run dev:database-engine` | `npm run dev -w @app/database-engine-web` |
| Build the standalone Database Engine workspace | `npm run build:database-engine` | `npm run build -w @app/database-engine-web` |
| Test the standalone Database Engine workspace | `npm run test:database-engine` | `npm run test -w @app/database-engine-web` |
| Start Kangur mobile | `npm run dev:mobile` | `npm run dev -w @kangur/mobile` |
| Preview Kangur mobile on web | `npm run dev:mobile:web` | `npm run web -w @kangur/mobile` |
| Typecheck the mobile workspace | `npm run typecheck:mobile` | `npm run typecheck -w @kangur/mobile` |

## Related Docs

- Repo quick start: [`README.md`](../../README.md)
- Build and toolchain hub: [`docs/build/README.md`](./README.md)
- Standalone StudiQ workspace guide:
  [`apps/studiq-web/README.md`](../../apps/studiq-web/README.md)
- Standalone CMS Builder workspace guide:
  [`apps/cms-builder-web/README.md`](../../apps/cms-builder-web/README.md)
- Standalone ecommerce workspace guide:
  [`apps/ecom-web/README.md`](../../apps/ecom-web/README.md)
- Standalone Database Engine workspace guide:
  [`apps/database-engine-web/README.md`](../../apps/database-engine-web/README.md)
- Kangur application topology:
  [`docs/kangur/studiq-application.md`](../kangur/studiq-application.md)
- Kangur mobile runtime guide: [`apps/mobile/README.md`](../../apps/mobile/README.md)
- Reserved mobile-web boundary:
  [`apps/mobile-web/README.md`](../../apps/mobile-web/README.md)
