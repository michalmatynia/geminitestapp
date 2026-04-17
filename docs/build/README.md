---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'cross-feature'
canonical: true
---

# Build And Toolchain Docs

This directory holds cross-feature documentation for build orchestration and
shared toolchain surfaces.

For repo-wide entrypoints, start with [`README.md`](../../README.md),
[`docs/README.md`](../README.md), and [`GEMINI.md`](../../GEMINI.md). This hub
is specifically for shared build, CI, and package-manager workflow guidance.

## Open This Hub When

- you need to know which repo command starts which application surface
- you need the right smoke or scanner lane before or after a change
- you are touching shared Bazel, Bun, CodeQL, Vercel, or CI wiring
- you need the canonical repo validation lanes rather than feature-local tests

## Placement Rule

- Use this directory for repo-wide build and package-manager workflow docs.
- Feature-specific build notes should stay with the owning feature docs.
- Platform policies that are broader than build orchestration should remain
  under [`docs/platform/`](../platform/README.md).

## Current Docs

- [`application-workspaces-and-commands.md`](./application-workspaces-and-commands.md) — app/workspace command map and `npm -w` semantics
- [`scanner-smoke-tests.md`](./scanner-smoke-tests.md) — which scanner smoke test to run and when
- [`vercel-deployment.md`](./vercel-deployment.md) — Vercel deploy config and operational constraints
- [`agentic-ci.md`](./agentic-ci.md) — CI behavior for agent-driven workflows
- [`agentic-engineering.md`](./agentic-engineering.md) — shared engineering workflow guidance
- [`bazel.md`](./bazel.md) — Bazel entrypoints and repo lanes
- [`bazel-buildbuddy.md`](./bazel-buildbuddy.md) — BuildBuddy integration notes
- [`bun.md`](./bun.md) — Bun workflow and parity expectations
- [`codeql.md`](./codeql.md) — CodeQL scanning workflow and triage
- [`general-improvements.md`](./general-improvements.md) — broad build/tooling improvement program context
- [`improvements/README.md`](./improvements/README.md) — generated improvement artifacts and latest aliases

## Scenario Map

| If you need to... | Open |
| --- | --- |
| start the right app or workspace | [`application-workspaces-and-commands.md`](./application-workspaces-and-commands.md) |
| choose the right scanner smoke suite | [`scanner-smoke-tests.md`](./scanner-smoke-tests.md) |
| understand repo-wide Bazel lanes | [`bazel.md`](./bazel.md) |
| understand Bun parity or Bun CI lanes | [`bun.md`](./bun.md) |
| inspect static-analysis or security scanning | [`codeql.md`](./codeql.md) |
| update Vercel deployment behavior | [`vercel-deployment.md`](./vercel-deployment.md) |
| review generated improvement outputs | [`improvements/README.md`](./improvements/README.md) |

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

- Workspace-level StudiQ shell guide:
  [`../../apps/studiq-web/README.md`](../../apps/studiq-web/README.md)
- Scanner smoke-test guide:
  [`./scanner-smoke-tests.md`](./scanner-smoke-tests.md)
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
- Shared Vercel production alias sync check:
  `npm run check:vercel:production:sync`
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
- Shared test suite inventory snapshot:
  `npm run metrics:test-suite-inventory`
- Shared major-run testing ledger surface:
  `npm run metrics:test-run-ledger`, `npm run testing:record -- --label="..." --status=ok --suite=...`
- Shared testing quality baseline snapshot check:
  `npm run check:test-quality`
- Shared Bun config contract check:
  `bun run check:bun:config`
- Shared Bun/npm/Node contract checks:
  `bun run check:toolchain:contract`
- Shared Bun repo toolchain lane:
  `bun run bun:repo:toolchain`
