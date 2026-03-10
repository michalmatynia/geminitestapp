---
owner: 'Platform Team'
last_reviewed: '2026-03-10'
status: 'active'
doc_type: 'index'
scope: 'cross-feature'
canonical: true
---

# Build And Toolchain Docs

This directory holds cross-feature documentation for build orchestration and
shared toolchain surfaces.

## Placement Rule

- Use this directory for repo-wide build and package-manager workflow docs.
- Feature-specific build notes should stay with the owning feature docs.
- Platform policies that are broader than build orchestration should remain
  under [`docs/platform/`](../platform/README.md).

## Current Docs

- [`bazel.md`](./bazel.md)
- [`bazel-buildbuddy.md`](./bazel-buildbuddy.md)

## Related Docs

- Bun support and local package-manager parity:
  [`docs/platform/bun-support.md`](../platform/bun-support.md)
- Shared toolchain mirror resync helper:
  `npm run sync:toolchain:mirrors`
- Shared npm-first toolchain contract checks:
  `npm run check:toolchain:contract:node`
- Shared npm-first toolchain contract test bundle:
  `npm run test:toolchain:contract`
- Shared Bun/npm/Node contract checks:
  `bun run check:toolchain:contract`
