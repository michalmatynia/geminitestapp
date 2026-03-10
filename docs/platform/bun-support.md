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
- The repo keeps both `package-lock.json` and `bun.lock`.

## Local Setup

Install Bun on your machine and ensure `~/.bun/bin` is on `PATH`.

The repo pins its expected Bun version in [`.bun-version`](../../.bun-version).

Verify:

```bash
bun --version
which bun
```

## Repo Usage

Recommended local Bun commands:

```bash
bun run check:bun:version
bun run check:bun:lock-sync
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
- `bun.lock` exists to support Bun users locally.
- `.bun-version` pins the Bun release expected by repo-level tooling.
- `bunfig.toml` pins Bun to a hoisted install layout to stay closer to the
  current npm dependency shape.
- `bun run check:bun:version` enforces that the installed Bun binary matches
  `.bun-version`.
- `bun run check:bun:lock-sync` verifies that `bun.lock` still matches the
  canonical `package-lock.json` without mutating the worktree.
- `bun run lock:bun:sync` refreshes `bun.lock` from the canonical
  `package-lock.json` after dependency changes.
- `bun run test:bun:runtime` runs the focused regression suite for the Bun
  runtime guard scripts.

## CI

- The repo keeps the existing npm/Node GitHub Actions matrix as the canonical
  merge gate.
- A separate lightweight workflow at
  `.github/workflows/bun-compatibility.yml` validates that Bun can install and
  run representative repo commands.
- That compatibility workflow now runs on normal pull requests and pushes,
  rather than only on Bun-specific file edits.
- It caches Bun's global package cache under `~/.bun/install/cache` to reduce
  repeated dependency downloads.
- The shared repo entrypoint for that validation is `bun run check:bun:compat`.
- That check is intentionally non-mutating and should not refresh generated
  metrics in a local worktree.
- It also enforces that `bun.lock` remains in sync with `package-lock.json`.
- It runs the focused Bun runtime regression suite as part of the compatibility
  contract.
- That workflow is compatibility coverage, not a signal that the app runtime
  has migrated to Bun.

If the repo later standardizes on Bun, update CI, onboarding docs, and the
package-manager contract together instead of flipping one surface in isolation.
