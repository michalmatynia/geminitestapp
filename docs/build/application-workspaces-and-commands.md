---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
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
| Start Kangur mobile | `npm run dev:mobile` | `npm run dev -w @kangur/mobile` |
| Preview Kangur mobile on web | `npm run dev:mobile:web` | `npm run web -w @kangur/mobile` |
| Typecheck the mobile workspace | `npm run typecheck:mobile` | `npm run typecheck -w @kangur/mobile` |

## Related Docs

- Repo quick start: [`README.md`](../../README.md)
- Build and toolchain hub: [`docs/build/README.md`](./README.md)
- Standalone StudiQ workspace guide:
  [`apps/studiq-web/README.md`](../../apps/studiq-web/README.md)
- Kangur application topology:
  [`docs/kangur/studiq-application.md`](../kangur/studiq-application.md)
- Kangur mobile runtime guide: [`apps/mobile/README.md`](../../apps/mobile/README.md)
- Reserved mobile-web boundary:
  [`apps/mobile-web/README.md`](../../apps/mobile-web/README.md)
