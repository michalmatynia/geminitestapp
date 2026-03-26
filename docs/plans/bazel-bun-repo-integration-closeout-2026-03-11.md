---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'closeout'
scope: 'cross-feature'
canonical: true
---

# Bazel And Bun Repo Integration Closeout

This is the retained closeout record for the March integration wave. Current public
build/runtime guidance lives in:

- [`../build/bazel.md`](../build/bazel.md)
- [`../build/bun.md`](../build/bun.md)
- [`../build/README.md`](../build/README.md)

## Outcome

The repo now exposes separate canonical execution lanes for Bazel and Bun.

### Bazel repo lanes

- `npm run bazel:toolchain`
- `npm run bazel:smoke`
- `npm run bazel:quality`
- `npm run bazel:regressions`
- `npm run bazel:ci`

### Bun repo lanes

- `bun run bun:repo:toolchain`
- `bun run bun:repo:smoke`
- `bun run bun:repo:quality`
- `bun run bun:repo:ci`

## What changed

### Bazel -> repo integration

- Added root aggregate Bazel lanes:
  - `//:repo_toolchain`
  - `//:repo_smoke`
  - `//:repo_quality`
  - `//:repo_regressions`
  - `//:repo_ci`
- Repointed repo scripts and helper shims to those root lanes.
- Added dedicated workflows:
  - `bazel-toolchain`
  - `bazel-smoke`
  - `bazel-quality`
  - `bazel-regressions`
- Made `MODULE.bazel` non-stub with explicit Bzlmod dependencies:
  - `bazel_skylib`
  - `rules_shell`
- Tightened several Bazel input groups so Bun/runtime/canonical/observability
  lanes no longer inherit unnecessarily broad repo filegroups.

### Bun -> repo integration

- Added direct Bun repo lanes for toolchain, smoke, quality, and CI.
- Updated the Bun workflow to run the repo CI lane instead of a looser
  compatibility-only step sequence.
- Kept Bun support separate from Bazel support in docs and entrypoints.

## Canonical public surface

Use the repo lane commands above as the steady-state interface.

Secondary surfaces still exist for compatibility:

- `tools/bazel/*.sh` helper scripts
- low-level Bun-backed Bazel targets such as `//:bun_compat`

Those are no longer the primary repo-facing commands.

## Contract coverage

The repo now has contract-level checks for both sides:

- Bun repo/support contract coverage in:
  - `scripts/runtime/bun-support-contract.test.ts`
- Bazel repo-lane contract coverage in:
  - `scripts/runtime/node-toolchain-contract.test.ts`

## Remaining work

- Validate the new lanes in shared CI over time:
  - `npm run bazel:ci`
  - `bun run bun:repo:ci`
- Keep the current Bun lock-sync fallback in `check-bun-lock-sync.cjs` until
  the upstream Bun wasm resolver issue is fully resolved, then remove the
  fallback and return to a single regenerate-and-compare path.
- If the repo wants deeper Bazel adoption later, the next logical step is
  moving more JS/TS tool ownership from local package-manager wrappers toward a
  fuller Bzlmod/rules-based model.
