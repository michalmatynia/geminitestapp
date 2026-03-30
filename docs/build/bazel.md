---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'overview'
scope: 'repository'
canonical: true
---

# Bazel rollout

This repository now ships a first-wave Bazel bootstrap using Bazelisk.

## Scope

The current Bazel layer wraps the existing npm-based build, quality, and test entrypoints so CI can start converging on stable Bazel targets without rewriting the Next.js, Mongo-backed runtime checks, Vitest, and Playwright toolchains in one cut.

Phase 2 adds source-aware dependency groups for selected JavaScript and TypeScript checks. These targets still invoke the existing underlying Node toolchain, but Bazel now has explicit input graphs for the highest-value CI checks instead of treating them as opaque shell commands.

The current toolchain model is intentionally pragmatic:

- Bazel is the execution/orchestration layer
- npm remains the package installation source of truth through [package-lock.json](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/package-lock.json)
- JS/TS tools execute through repo-owned Bazel runner scripts against local `node_modules/.bin/*`
- Bun remains a separate repo-supported runtime lane; Bazel does not own Bun support, it only exposes some Bun-backed checks as Bazel targets too
- deeper `rules_js`/lockfile-native modeling is deferred until the repo adopts a lockfile/toolchain shape that fits it cleanly

`MODULE.bazel` is now an explicit Bzlmod entrypoint instead of a placeholder
stub. The repo currently declares:

- `bazel_skylib` for future Starlark utility expansion
- `rules_shell` for the shell-heavy repo orchestration layer

That does not mean the repo has migrated to full Bazel-managed JS dependencies
yet. It means the Bazel module layer is now explicit and versioned instead of
empty.

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
- `//:integration_mongo` -> direct Mongo integration baseline runner with metrics artifact output
- `//:case_resolver_capture_mapping_e2e` -> direct Playwright suite runner for the Case Resolver capture-mapping flow
- `//:products_list_category_e2e` -> direct Playwright suite runner for the Products List category-label flow
- `//:products_trigger_queue_e2e` -> direct Playwright suite runner for the product trigger-queue flow
- `//:next_build` -> direct Next.js production build execution
- `//:toolchain_contract` -> direct Bun-backed toolchain contract execution
- `//:bun_runtime_contract` -> direct Bun-backed runtime contract execution
- `//:bun_compat` -> direct Bun-backed compatibility lane execution

The main repo aggregation lanes are now:

- `//:repo_toolchain` -> repo-level toolchain and Bun contract lane
- `//:repo_smoke` -> repo smoke lane
- `//:repo_quality` -> repo quality/documentation/canonical lane
- `//:repo_regressions` -> repo regression bundles
- `//:repo_ci` -> full repo lane composed from the four lanes above

## Install

```bash
npm install
```

`npm install` remains the canonical path for Bazel and CI because the current
Bazel layer still executes JS/TS tools against repo-local `node_modules`
instead of a Bazel-native JS dependency graph. The active module layer is the
explicit `MODULE.bazel` + `rules_shell` orchestration setup, not a
`npm_translate_lock`/`rules_js` dependency import pipeline.

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
npm run bazel:toolchain
npm run bazel:quality
npm run bazel:smoke
npm run bazel:regressions
npm run bazel:ci
```

For the Bun execution model itself, see [bun.md](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/docs/build/bun.md).

## Canonical entrypoints

Use these as the repo-facing Bazel commands:

- `npm run bazel:toolchain`
- `npm run bazel:smoke`
- `npm run bazel:quality`
- `npm run bazel:regressions`
- `npm run bazel:ci`

Use these as the companion repo-facing Bun commands:

- `bun run bun:repo:toolchain`
- `bun run bun:repo:smoke`
- `bun run bun:repo:quality`
- `bun run bun:repo:ci`

The shell scripts under `tools/bazel/` still exist, but they are now
compatibility shims around the root Bazel lanes rather than the canonical
interface.

The Bun-specific Bazel targets still exist for teams that want them inside the
Bazel graph, but they are secondary surfaces. Invoke them through the generic
entrypoint when needed, for example:

```bash
npm run bazel -- run //:bun_contracts
npm run bazel -- run //:bun_runtime_contract
npm run bazel -- run //:bun_compat
```

The dedicated Bazel smoke workflow now exercises the repo smoke lane:

- `//:repo_smoke`

The workflow and local smoke path now use the same repo-owned entrypoint:

```bash
npm run bazel:smoke
```

The repo regression bundles stay outside the smoke lane on purpose and live under:

- `//:repo_regressions`

The workflow and local specialized-regression path now use the same repo-owned entrypoint:

```bash
npm run bazel:regressions
```

They run in a separate workflow:

- [bazel-regressions.yml](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/.github/workflows/bazel-regressions.yml)

## CI validation matrix

Shared smoke lane:

- workflow: `bazel-smoke`
- command: `npm run bazel:smoke`
- targets:
  - `//:repo_smoke`

Repo quality lane:

- workflow: `bazel-quality`
- command: `npm run bazel:quality`
- targets:
  - `//:repo_quality`

Repo regression lane:

- workflow: `bazel-regressions`
- command: `npm run bazel:regressions`
- targets:
  - `//:repo_regressions`

Dedicated product-list Playwright regression:

- workflow: `products-list-regression`
- command: `npm run bazel -- run //:products_list_category_e2e`
- package script: `npm run test:products:list:e2e`
- targets:
  - `//:products_list_category_e2e`

Dedicated Kangur AI Tutor selection-handoff Playwright regression:

- workflow: `kangur-ai-tutor-selection-regression`
- command: `npm run bazel -- run //:kangur_ai_tutor_selection_handoff_e2e`
- package script: `npm run test:kangur:ai-tutor:selection-handoff:e2e`
- targets:
  - `//:kangur_ai_tutor_selection_handoff_e2e`

Repo toolchain lane:

- workflow: `bazel-toolchain`
- command: `npm run bazel:toolchain`
- targets:
  - `//:repo_toolchain`

Validated direct Bazel gates:

- `//:lint`
- `//:typecheck`
- `//:unit`
- `//:integration_mongo`
- `//:next_build`
- `//:api_error_sources`
- `//:case_resolver_regression`
- `//:kangur_ai_tutor_selection_handoff_e2e`
- `//:products_list_category_e2e`
- `//:products_trigger_queue_unit`

Unified local CI entrypoint:

- command: `npm run bazel:ci`
- includes:
  - `//:repo_ci`

## Branch protection recommendation

These checks should be required in GitHub branch protection:

- `bazel-toolchain`
- `bazel-smoke`
- `bazel-quality`
- `bazel-regressions`

This repository can document those requirements, but GitHub branch protection itself must still be configured in repository settings.

The minimum GitHub branch protection baseline is now audited separately with
`npm run check:github:branch-protection`, which verifies that `main` still
requires the `toolchain-contract` check and disallows force-push/deletion
drift. The live production-domain alias remains covered by
`npm run check:vercel:production:sync` and its scheduled workflow.

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
- `//:kangur_ai_tutor_selection_handoff_e2e`
- `//:critical_flows`
- `//:security_smoke`
- `//:accessibility_smoke`
- `//:weekly_quality_report`
- `//:weekly_trend_index`
- `//:weekly_duration_budgets`
- `//:integration_mongo`
- `//:next_build`
- `//:toolchain_contract`
- `//:bun_config`
- `//:bun_version`
- `//:bun_lock_check`
- `//:bun_runtime_contract`
- `//:bun_compat`
- `//:bun_contracts`
- `//:repo_toolchain`
- `//:repo_smoke`
- `//:repo_quality`
- `//:repo_regressions`
- `//:repo_ci`

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
- repo aggregate lanes now live as root Bazel targets instead of only Bash wrapper scripts.
- Bun-backed toolchain and compatibility lanes remain available as Bazel targets, but Bun repo support is documented separately in [bun.md](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/docs/build/bun.md).
- the Bun runtime/compatibility and core canonical/observability lanes now use narrower Bazel input groups instead of inheriting broad repo-wide filegroups.
- `unit`, `critical_flows`, `security_smoke`, and `accessibility_smoke` now also bypass the top-level npm wrapper layer.
- `case_resolver_regression` and `products_trigger_queue_unit` now also bypass the wrapper layer.
- `integration_mongo` now also executes directly while preserving the existing CI service/env assumptions.
- Playwright e2e gate targets now call the shared suite runner directly instead of routing through top-level npm scripts.
- `next_build` now executes directly as a Bazel target while preserving the existing Next.js build contract.
- Remote cache support is injected by the repo-owned Bazel wrapper rather than hard-coding provider-specific settings into `.bazelrc`.
- The next migration step is to decide whether deeper Bazel-native JS dependency modeling is worth the complexity, now that the core CI/build entry surface is already Bazel-executed.

## Agentic engineering entrypoints

The Bazel lanes are now paired with repo-owned agentic routing commands:
- `npm run agentic:classify -- <changed files...>`
- `npm run agentic:preflight -- <changed files...>`

Those commands read `config/agentic/domains/*.json`, derive the impacted doc generators, scanners, and validation targets, and write `artifacts/agent-work-order.json` for downstream agent runs.

See [agentic-engineering.md](./agentic-engineering.md) for the routing contract.
