# Bazel rollout

This repository now ships a first-wave Bazel bootstrap using Bazelisk.

## Scope

The current Bazel layer wraps the existing npm-based build, quality, and test entrypoints so CI can start converging on stable Bazel targets without rewriting the Next.js, Prisma, Vitest, and Playwright toolchains in one cut.

Phase 2 adds source-aware dependency groups for selected JavaScript and TypeScript checks. These targets still invoke the existing underlying Node toolchain, but Bazel now has explicit input graphs for the highest-value CI checks instead of treating them as opaque shell commands.

The current toolchain model is intentionally pragmatic:

- Bazel is the execution/orchestration layer
- npm remains the package installation source of truth through [package-lock.json](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/package-lock.json)
- JS/TS tools execute through repo-owned Bazel runner scripts against local `node_modules/.bin/*`
- deeper `rules_js`/lockfile-native modeling is deferred until the repo adopts a lockfile/toolchain shape that fits it cleanly

The first direct Bazel-executed checks are now:

- `//:lint` -> `//tools/js:lint`
- `//:typecheck` -> `//tools/js:typecheck`
- `//:api_error_sources` -> direct `node scripts/quality/check-api-error-sources.mjs`
- `//:docs_structure` -> direct `node scripts/docs/check-docs-structure.mjs`
- `//:scanner_contracts` -> direct ESLint + Vitest execution without `npm run`
- `//:validator_docs_check` -> direct `tsx scripts/docs/check-validator-doc-coverage.ts`
- `//:validator_docs_generate` -> direct `tsx scripts/docs/generate-validator-docs.ts`
- `//:ai_paths_node_docs` -> direct docs verify + tooltip coverage execution
- `//:canonical_sitewide` -> direct `node scripts/canonical/check-sitewide.mjs`
- `//:ai_paths_canonical` -> direct `node scripts/ai-paths/check-canonical.mjs`
- `//:architecture_collect_metrics` -> direct `node scripts/architecture/collect-metrics.mjs --ci`
- `//:architecture_hotspots` -> direct `node scripts/perf/route-hotspots.mjs`
- `//:architecture_critical_paths` -> direct `node scripts/perf/check-critical-path-performance.mjs --strict --ci`
- `//:architecture_guardrails` -> direct `node scripts/architecture/check-guardrails.mjs`
- `//:observability` -> direct `node scripts/observability/check-observability.mjs --mode=check`
- `//:ui_consolidation` -> direct `node scripts/architecture/check-ui-consolidation.mjs`
- `//:weekly_quality_report` -> direct `node scripts/quality/generate-weekly-report.mjs --strict --ci`
- `//:weekly_trend_index` -> direct `node scripts/quality/generate-trend-index.mjs --ci --no-history`
- `//:weekly_duration_budgets` -> direct `node scripts/quality/recalibrate-weekly-duration-budgets.mjs --ci --no-history`
- `//:unit` -> `//tools/js:unit` via direct Vitest execution
- `//:case_resolver_regression` -> direct Vitest regression bundle execution
- `//:products_trigger_queue_unit` -> direct Vitest trigger-queue regression bundle execution
- `//:unit_domain_timings` -> direct `node scripts/testing/run-unit-domain-timings.mjs --strict --ci`
- `//:critical_flows` -> direct `node scripts/testing/run-critical-flow-tests.mjs --strict --ci`
- `//:security_smoke` -> direct `node scripts/testing/run-security-smoke-tests.mjs --strict --ci`
- `//:accessibility_smoke` -> direct `node scripts/testing/run-accessibility-smoke-tests.mjs --strict --ci`
- `//:integration_prisma` -> direct Prisma preflight + `tsx` DB check + Vitest integration project
- `//:integration_mongo` -> direct `vitest run --project integration-mongo`
- `//:case_resolver_capture_mapping_e2e` -> direct Playwright suite runner for the Case Resolver capture-mapping flow
- `//:products_trigger_queue_e2e` -> direct Playwright suite runner for the product trigger-queue flow
- `//:next_build` -> direct Prisma generate + Next.js production build execution

## Install

```bash
npm install
```

`npm install` remains the canonical path for Bazel and CI because
`npm_translate_lock` is still sourced from
[package-lock.json](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/package-lock.json).

For local toolchain and Bun parity checks, use:

```bash
npm run sync:toolchain:mirrors
npm run check:toolchain:contract:node
npm run test:toolchain:contract
bun run check:bun:config
bun run check:toolchain:contract
bun run check:node:toolchain-sync
bun run lock:bun:sync
bun run test:bun:runtime
bun install --frozen-lockfile
bun run check:bun:compat
```

Use Bazel through Bazelisk:

```bash
npm run bazel -- run //:lint
npm run bazel -- run //:typecheck
npm run bazel -- run //:unit
npm run bazel -- run //:next_build
npm run bazel:smoke
npm run bazel:regressions
npm run bazel:ci
```

The dedicated Bazel smoke workflow now exercises:

- `bazel query //:all`
- `//:lint`
- `//:typecheck`
- `//:unit`
- `//:integration_prisma`
- `//:integration_mongo`
- `//:next_build`
- `//:api_error_sources`

The workflow and local smoke path now use the same repo-owned entrypoint:

```bash
npm run bazel:smoke
```

The specialized regression bundles stay outside the smoke lane on purpose:

- `//:case_resolver_regression`
- `//:products_trigger_queue_unit`

The workflow and local specialized-regression path now use the same repo-owned entrypoint:

```bash
npm run bazel:regressions
```

They run in a separate workflow:

- [bazel-specialized-regressions.yml](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/.github/workflows/bazel-specialized-regressions.yml)

## CI validation matrix

Shared smoke lane:

- workflow: `bazel-smoke`
- command: `npm run bazel:smoke`
- targets:
  - `bazel query //:all`
  - `//:lint`
  - `//:typecheck`
  - `//:unit`
  - `//:integration_prisma`
  - `//:integration_mongo`
  - `//:next_build`
  - `//:api_error_sources`

Specialized regression lane:

- workflow: `bazel-specialized-regressions`
- command: `npm run bazel:regressions`
- targets:
  - `//:case_resolver_regression`
  - `//:products_trigger_queue_unit`

Validated direct Bazel gates:

- `//:lint`
- `//:typecheck`
- `//:unit`
- `//:integration_prisma`
- `//:integration_mongo`
- `//:next_build`
- `//:api_error_sources`
- `//:case_resolver_regression`
- `//:products_trigger_queue_unit`

Unified local CI entrypoint:

- command: `npm run bazel:ci`
- includes:
  - `npm run bazel:smoke`
  - `npm run bazel:regressions`

## Branch protection recommendation

These checks should be required in GitHub branch protection:

- `bazel-smoke`
- `bazel-specialized-regressions`

This repository can document those requirements, but GitHub branch protection itself must still be configured in repository settings.

## Optional remote cache

The repository now supports provider-neutral remote cache injection through [run-bazel.sh](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/tools/bazel/run-bazel.sh).

Set these environment variables in CI or locally if you want remote caching:

- `BAZEL_REMOTE_CACHE_URL`
- `BAZEL_REMOTE_CACHE_HEADER`
- `BAZEL_REMOTE_CACHE_UPLOAD_LOCAL_RESULTS`

Example:

```bash
export BAZEL_REMOTE_CACHE_URL="grpcs://your-cache.example.com"
export BAZEL_REMOTE_CACHE_HEADER="x-buildbuddy-api-key=REDACTED"
export BAZEL_REMOTE_CACHE_UPLOAD_LOCAL_RESULTS=false
npm run bazel -- run //:lint
```

CI is wired so:

- pull requests read from the remote cache by default
- pushes may upload local results back to the remote cache

If the cache variables are unset, Bazel falls back to local disk/repository caches only.

Tool targets are available through repo-owned Bazel wrappers:

```bash
npm run bazel -- run //tools/js:eslint -- --version
npm run bazel -- run //tools/js:tsc -- --version
npm run bazel -- run //tools/js:vitest -- --version
npm run bazel -- run //tools/js:next -- --version
```

## Core targets

- `//:canonical_sitewide`
- `//:ai_paths_node_docs`
- `//:ai_paths_canonical`
- `//:api_error_sources`
- `//:observability`
- `//:architecture_collect_metrics`
- `//:architecture_hotspots`
- `//:architecture_critical_paths`
- `//:architecture_guardrails`
- `//:ui_consolidation`
- `//:docs_structure`
- `//:scanner_contracts`
- `//:validator_docs_check`
- `//:validator_docs_generate`
- `//:lint`
- `//:typecheck`
- `//:unit`
- `//:unit_domain_timings`
- `//:case_resolver_regression`
- `//:case_resolver_capture_mapping_e2e`
- `//:products_trigger_queue_unit`
- `//:products_trigger_queue_e2e`
- `//:critical_flows`
- `//:security_smoke`
- `//:accessibility_smoke`
- `//:weekly_quality_report`
- `//:weekly_trend_index`
- `//:weekly_duration_budgets`
- `//:integration_prisma`
- `//:integration_mongo`
- `//:next_build`

## Current rollout model

- Bazel is the orchestration layer for the main CI checks.
- Existing npm scripts remain available for compatibility, but the Bazel targets no longer depend on the old Bazel-side npm wrapper layer.
- Selected targets now carry explicit Bazel file dependencies:
  - `//:lint`
  - `//:typecheck`
  - `//:scanner_contracts`
  - `//:docs_structure`
  - `//:api_error_sources`
  - `//:ai_paths_node_docs`
  - `//:validator_docs_check`
  - `//:validator_docs_generate`
- `lint` and `typecheck` now execute through direct Bazel-owned JS tool wrappers rather than `npm run`.
- `api_error_sources`, `docs_structure`, and `scanner_contracts` now execute directly instead of going through npm-script wrappers.
- `validator_docs_check`, `validator_docs_generate`, and `ai_paths_node_docs` now also bypass the top-level npm wrapper layer.
- `architecture_*` and `weekly_*` targets now execute directly and carry explicit Bazel input groups rather than npm wrapper indirection.
- `observability`, `ui_consolidation`, and `unit_domain_timings` now also execute directly.
- `canonical_sitewide` and `ai_paths_canonical` now also execute directly.
- `unit`, `critical_flows`, `security_smoke`, and `accessibility_smoke` now also bypass the top-level npm wrapper layer.
- `case_resolver_regression` and `products_trigger_queue_unit` now also bypass the wrapper layer.
- `integration_prisma` and `integration_mongo` now also execute directly while preserving the existing CI service/env assumptions.
- Playwright e2e gate targets now call the shared suite runner directly instead of routing through top-level npm scripts.
- `next_build` now executes directly as a Bazel target while still preserving the existing Next.js + Prisma build contract.
- Remote cache support is injected by the repo-owned Bazel wrapper rather than hard-coding provider-specific settings into `.bazelrc`.
- The next migration step is to decide whether deeper Bazel-native JS dependency modeling is worth the complexity, now that the core CI/build entry surface is already Bazel-executed.
