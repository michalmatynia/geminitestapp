---
owner: 'Platform Team'
last_reviewed: '2026-03-10'
status: 'active'
doc_type: 'reference'
scope: 'platform'
canonical: true
---

# Bun Support

This repository now supports Bun as an optional local tool for installs and
selected script execution.

## Current Contract

- Bun is supported for local development workflows.
- Node remains the required runtime for the application server and build flows.
- npm remains the canonical package manager for CI and existing composite repo
  scripts.
- `package.json#packageManager` records that canonical npm toolchain for
  Corepack-aware environments.
- The repo keeps both `package-lock.json` and `bun.lock`.

## Local Setup

Install Bun on your machine and ensure `~/.bun/bin` is on `PATH`.

The repo pins its expected Bun version in [`.bun-version`](../../.bun-version)
and mirrors that version in [`package.json`](../../package.json) under
`engines.bun`.

The repo also keeps its Node toolchain pin in both [`.nvmrc`](../../.nvmrc)
and [`.node-version`](../../.node-version) so Bun-adjacent workflows and local
tooling stay aligned on the same major release.

For `asdf`/`mise`-style version managers, the repo also mirrors both pins in
[`.tool-versions`](../../.tool-versions).

Verify:

```bash
bun --version
which bun
```

## Repo Usage

Recommended local Bun commands:

```bash
npm run sync:toolchain:mirrors
bun run check:bun:version
bun run check:bun:lock-sync
bun run check:package-manager-contract
bun run check:node:toolchain-sync
npm run check:toolchain:contract:node
npm run test:toolchain:contract
bun run check:toolchain:contract
bun run lock:bun:sync
bun run test:bun:runtime
bun install --frozen-lockfile
bun run check:bun:compat
```

Safe examples that already work in this repo:

```bash
bun run check:unsafe-patterns
bun run lint -- --help
```

## Constraints

These flows should remain Node-first unless explicitly migrated and verified:

- `npm run dev`
- `npm run build`
- `npm run start`
- GitHub Actions workflows under `.github/workflows/`

Many composite scripts in `package.json` still chain through `npm run`. That is
intentional for now; Bun support is additive, not a package-manager cutover.

## Lockfiles

- `package-lock.json` remains the canonical CI lockfile.
- `bun run check:package-manager-contract` verifies that `package.json`
  remains pinned to npm, that `packageManager` satisfies `engines.npm`, and
  that `package-lock.json` still uses the expected npm lockfile format.
- `bun.lock` exists to support Bun users locally.
- `.bun-version` pins the Bun release expected by repo-level tooling.
- `package.json` mirrors that pin in `engines.bun` so package metadata and
  runtime checks stay aligned.
- `.nvmrc` remains the canonical Node pin, and `.node-version` mirrors it for
  toolchains that do not read `.nvmrc`.
- `.tool-versions` mirrors both the Node and Bun pins for local version
  managers that read a combined toolchain file.
- `npm run sync:toolchain:mirrors` refreshes `.node-version` and
  `.tool-versions` from the canonical `.nvmrc` and `.bun-version` pins after a
  toolchain bump.
- `bun run check:node:toolchain-sync` verifies that `.nvmrc`,
  `.node-version`, `.tool-versions`, `.bun-version`, and
  `package.json#engines.node` and `package.json#engines.bun` stay aligned.
- `npm run check:toolchain:contract:node` runs the npm/package-lock and Node
  pin checks without requiring Bun, so canonical Node-first CI can enforce the
  core toolchain contract too.
- `npm run test:toolchain:contract` runs the focused runtime contract tests
  without requiring Bun on the command path.
- `bunfig.toml` pins Bun to a hoisted install layout to stay closer to the
  current npm dependency shape.
- `bun run check:bun:version` enforces that the installed Bun binary matches
  `.bun-version` and that `package.json#engines.bun` matches the same pin.
- `bun run check:bun:lock-sync` verifies that `bun.lock` still matches the
  canonical `package-lock.json` without mutating the worktree.
- `bun run check:toolchain:contract` runs the repo-level package-manager,
  Node toolchain, Bun version, and Bun lockfile contract checks together.
- `bun run lock:bun:sync` refreshes `bun.lock` from the canonical
  `package-lock.json` after dependency changes.
- `bun run test:bun:runtime` runs the focused regression suite for the Bun
  runtime guards and Bun support contract checks.

## CI

- The repo keeps the existing npm/Node GitHub Actions matrix as the canonical
  merge gate.
- That canonical matrix now includes a dedicated `toolchain-contract` job, so
  the npm/package-lock and Node pin contract runs in the main Node-based gate
  as well.
- The Node-side toolchain jobs cache npm dependencies against the canonical
  `package-lock.json` explicitly instead of relying on implicit lockfile
  discovery, and that same explicit cache contract now applies to the other
  `.nvmrc`-based Node workflows that restore npm dependencies.
- A lightweight `.github/workflows/toolchain-contract.yml` workflow now enforces
  the npm/package-lock and Node pin contract directly through Node as a manual
  fallback workflow, and runs the same focused toolchain contract test bundle
  after `npm ci`, without depending on Bun setup.
- A separate lightweight workflow at
  `.github/workflows/bun-compatibility.yml` validates that Bun can install and
  run representative repo commands.
- That workflow resolves Node from [`.nvmrc`](../../.nvmrc) and Bun from
  [`.bun-version`](../../.bun-version) instead of hardcoding tool versions.
- The repo workflows that intentionally follow the standard Node 22 toolchain
  now also resolve Node from [`.nvmrc`](../../.nvmrc) instead of repeating a
  hardcoded `22`.
- That compatibility workflow now runs on normal pull requests and pushes,
  rather than only on Bun-specific file edits.
- It caches Bun's global package cache under `~/.bun/install/cache` to reduce
  repeated dependency downloads.
- That cache key follows the repo Node and Bun version files as well as both
  lockfiles, so toolchain pin changes invalidate the Bun cache cleanly.
- The shared repo entrypoint for that validation is `bun run check:bun:compat`.
- That check is intentionally non-mutating and should not refresh generated
  metrics in a local worktree.
- It also enforces that `bun.lock` remains in sync with `package-lock.json`.
- It runs the focused Bun runtime and contract regression suite as part of the
  compatibility contract.
- That workflow is compatibility coverage, not a signal that the app runtime
  has migrated to Bun.

If the repo later standardizes on Bun, update CI, onboarding docs, and the
package-manager contract together instead of flipping one surface in isolation.
