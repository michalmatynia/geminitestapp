---
owner: 'Kangur Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'guide'
scope: 'feature:kangur'
canonical: true
---

# Kangur Cross-Platform Workspace

## Purpose

This document describes the current workspace boundaries for Kangur across the
root web app, the Expo mobile app, and the shared packages. The file name stays
historical, but the workspace is no longer just a scaffold; it is the active
cross-platform layout.

## Current topology

- npm workspaces cover `apps/*` and `packages/*`.
- The root Next.js application remains at the repository root and is still the canonical web deployment.
- `apps/mobile` is the active Expo Router app for native learner-facing Kangur flows.
- `apps/mobile-web` is reserved for a future dedicated Expo or React Native Web target.
- Shared TypeScript and task orchestration still run through `tsconfig.base.json` and `turbo.json`.

## Important constraint

The existing Next.js app stays at the repo root for now. There is no active
`apps/web` workspace, and documentation should not imply otherwise.

## Shared package responsibilities

- `packages/kangur-contracts`: shared data contracts for Kangur lessons, tests, duels, auth, API envelopes, and settings keys.
- `packages/kangur-core`: portable domain logic such as progress stores, lessons, lesson content, assignments, profile summaries, leaderboard builders, badges, and practice generation.
- `packages/kangur-api-client`: the shared client wrapper for `/api/kangur/*`.
- `packages/kangur-platform`: cross-platform auth session, client storage, and port abstractions that mobile and web adapters build on.

## App responsibilities

- Repository root app: public web routing, CMS integration, `/admin/kangur`, and `/api/kangur/*`.
- `apps/mobile`: native routing, mobile auth/bootstrap, staged startup flow, device storage, and learner-facing mobile UI.
- `apps/mobile-web`: placeholder only; do not move web ownership here until a deliberate React Native Web target exists.

## Cross-platform rules

- Shared logic belongs in packages when it is deterministic, transport-level, or independent of React platform primitives.
- Native-only routing, Expo bootstrapping, and device storage wiring stay in `apps/mobile`.
- Web-only CMS composition, admin tooling, and route ownership stay in the root app until a formal migration plan exists.
- Local app and package READMEs can document runtime, commands, and exports, but canonical feature behavior should still be anchored in `docs/kangur/*`.

## Mobile startup contract

The current native runtime is not just route mapping; it includes a startup model:

- Expo splash hands off to a branded bootstrap gate before route content mounts.
- Auth restores persisted learner state before background refresh.
- Home restores tiny persisted lesson and score snapshots before heavier sections wake up.
- Secondary home content is staged behind interaction-aware deferred panels instead of loading in one burst.

## Validation commands

- `npm run dev:mobile`
- `npm run dev:mobile:ios:local`
- `npm run dev:mobile:android:local`
- `npm run typecheck:mobile`
- `npm run test:mobile:tooling`
- `npm run docs:structure:check`

## Current boundaries

- The mobile app consumes the root Kangur backend; it does not ship an independent service layer.
- Expo web preview for `apps/mobile` is a validation path, not the canonical desktop web product.
- Branch-local mobile surfaces that are still failing unrelated typecheck should be treated as in-progress rather than stable cross-platform contracts.

## Related local entry docs

- `apps/mobile/README.md`
- `packages/kangur-contracts/README.md`
- `packages/kangur-core/README.md`
- `packages/kangur-api-client/README.md`
- `packages/kangur-platform/README.md`
