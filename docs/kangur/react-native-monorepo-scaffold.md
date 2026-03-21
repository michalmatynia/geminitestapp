---
owner: 'Kangur Team'
last_reviewed: '2026-03-21'
status: 'active'
doc_type: 'guide'
scope: 'feature:kangur'
canonical: true
---

# Kangur React Native Monorepo Scaffold

## Current scaffold

This repo now has the first migration layer for a Kangur mobile plus desktop monorepo:

- `turbo.json` for task orchestration
- `tsconfig.base.json` for shared TypeScript defaults
- npm workspaces for `apps/*` and `packages/*`
- `packages/kangur-contracts` as the first shared package shell
- `packages/kangur-core` as the extraction map for portable domain logic
- `packages/kangur-api-client` as a shared HTTP client scaffold for `/api/kangur/*`
- `packages/kangur-platform` as the cross-platform auth/navigation/storage boundary
- `apps/mobile` as the first native shell scaffold

## Important constraint

The existing Next.js app stays at the repo root for now. The migration path is:

1. extract shared packages first
2. prove native auth and storage
3. add native screens
4. move the Next app into `apps/web` only after the workspace boundaries are stable

## Next execution steps

1. Extract `src/shared/contracts/kangur.ts` fully into `packages/kangur-contracts`
2. Extract progress and question logic into `packages/kangur-core`
3. Implement a native auth strategy behind `packages/kangur-platform`
4. Wire `apps/mobile` to `packages/kangur-api-client`
5. Decide whether `GeometryDrawingGame` ships in v1 native or remains web-only initially
