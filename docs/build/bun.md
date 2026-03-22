---
owner: 'Platform Team'
last_reviewed: '2026-03-22'
status: 'active'
doc_type: 'overview'
scope: 'repository'
canonical: true
---

# Bun support

This repository now treats Bun as a supported repo runtime lane for selected quality, architecture, docs, and toolchain checks.

## Operating model

- npm remains the canonical package manager and install source of truth.
- Bazel is the preferred orchestration layer for CI-grade repo checks.
- Bun is a supported direct runtime for selected repo scripts and toolchain contracts.
- Bun support is separate from Bazel support. Some checks are available through both, but Bun is also usable directly at the repo level.

## Canonical package management

Use npm for dependency installation and lockfile ownership:

```bash
npm install
```

The Bun lockfile remains a mirrored contract artifact:

```bash
npm run lock:bun:sync
npm run check:bun:lock-sync
```

## Bun contract lanes

Direct script lanes:

```bash
npm run check:toolchain:contract
npm run test:bun:runtime
npm run check:bun:compat
bun run bun:repo:toolchain
bun run bun:repo:smoke
bun run bun:repo:quality
bun run bun:repo:ci
```

Direct Bun repo lanes:

```bash
bun run bun:check:docs-structure
bun run bun:check:api-error-sources
bun run bun:check:canonical-sitewide
bun run bun:check:observability
bun run bun:check:architecture-guardrails
bun run bun:check:ui-consolidation
```

Bazel-backed lanes:

```bash
npm run bazel:toolchain
npm run bazel -- run //:bun_contracts
npm run bazel -- run //:bun_runtime_contract
npm run bazel -- run //:bun_compat
```

Available Bazel targets:

- `//:toolchain_contract`
- `//:bun_config`
- `//:bun_version`
- `//:bun_lock_check`
- `//:bun_runtime_contract`
- `//:bun_compat`
- `//:bun_contracts`

Recommended repo-level Bun entrypoints:

- `bun run bun:repo:toolchain`
- `bun run bun:repo:smoke`
- `bun run bun:repo:quality`
- `bun run bun:repo:ci`

These are the canonical repo-facing Bun commands.

The Bazel-exposed Bun targets remain available for teams that want the checks
inside the Bazel execution graph, but they are not the primary Bun interface
for the repo.

## Intentional non-goals

Bun is not the canonical path for:

- `dev`
- `build`
- `start`
- Next.js production builds

Those remain on the Node/npm toolchain until the repo intentionally migrates them.
