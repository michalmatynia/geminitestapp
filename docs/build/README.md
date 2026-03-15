---
owner: 'Platform Team'
last_reviewed: '2026-03-11'
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

- [`agentic-ci.md`](./agentic-ci.md)
- [`agentic-engineering.md`](./agentic-engineering.md)
- [`bazel.md`](./bazel.md)
- [`bazel-buildbuddy.md`](./bazel-buildbuddy.md)
- [`bun.md`](./bun.md)
- [`codeql.md`](./codeql.md)
- [`general-improvements.md`](./general-improvements.md)

## Canonical Repo Lanes

- Bazel repo toolchain lane:
  `npm run bazel:toolchain`
- Bazel repo smoke lane:
  `npm run bazel:smoke`
- Bazel repo quality lane:
  `npm run bazel:quality`
- Bazel repo regression lane:
  `npm run bazel:regressions`
- Bazel repo CI lane:
  `npm run bazel:ci`
- Bun repo smoke lane:
  `bun run bun:repo:smoke`
- Bun repo toolchain lane:
  `bun run bun:repo:toolchain`
- Bun repo quality lane:
  `bun run bun:repo:quality`
- Bun repo CI lane:
  `bun run bun:repo:ci`

## Related Docs

- High-memory build fallback when `npm run build` OOMs:
  `npm run build:hi-mem`
- Bun build/runtime lane overview:
  [`docs/build/bun.md`](./bun.md)
- Bun support contract and local package-manager parity:
  [`docs/platform/bun-support.md`](../platform/bun-support.md)
- Shared toolchain mirror resync helper:
  `npm run sync:toolchain:mirrors`
- Shared npm-first toolchain contract checks:
  `npm run check:toolchain:contract:node`
- Shared npm-first toolchain contract test bundle:
  `npm run test:toolchain:contract`
- CodeQL scanning workflow and triage guide:
  [`docs/build/codeql.md`](./codeql.md)
- Shared high-risk coverage gate:
  `npm run check:coverage:high-risk`
- Shared high-risk coverage baseline runner:
  `npm run test:coverage:high-risk`
  Weekly CI runs it with `HIGH_RISK_COVERAGE_CONCURRENCY=2` to keep the
  split-domain coverage sweep bounded.
- Shared feature test-distribution quality scan:
  `npm run check:test-distribution`
- Shared testing quality baseline snapshot check:
  `npm run check:test-quality`
- Shared Bun config contract check:
  `bun run check:bun:config`
- Shared Bun/npm/Node contract checks:
  `bun run check:toolchain:contract`
- Shared Bun repo toolchain lane:
  `bun run bun:repo:toolchain`
