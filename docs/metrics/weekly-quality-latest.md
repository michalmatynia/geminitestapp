# Weekly Quality Report

Generated at: 2026-03-08T17:04:55.634Z
Node: v24.3.0

## Quality Check Summary

- Total checks: 18
- Passed: 14
- Failed: 1
- Timed out: 0
- Skipped: 3

## Baseline Status

- Build pass rate: 100%
- Build preflight: removed (Removed .next/standalone before build to reclaim disk space. Removed stale .next/trace-build before running build check.)
- Lint pass rate: n/a%
- Lint-domain pass rate: 0%
- Typecheck pass rate: 100%
- Critical-flow gate pass rate: 100%
- Security smoke gate pass rate: 100%
- Unit-domain gate pass rate: 100%
- Full unit pass rate: n/a%
- E2E test pass rate: n/a%
- Duration budget alerts: 0

Full repository lint was skipped in this run. Use `--include-full-lint` to include the broad `eslint src` sweep.

Full unit suite was skipped in this run. Use `--include-full-unit` to include full unit coverage in baseline.

E2E tests were skipped in this run. Use `--include-e2e` for full end-to-end baseline.

## Check Details

| Check | Status | Duration | Exit | Command |
| --- | --- | ---: | ---: | --- |
| Build | PASS | 2.3m | 0 | `npm run build` |
| Lint | SKIPPED | 0ms | - | `npm run lint` |
| Lint Domain Gate | FAIL | 2.0m | 1 | `node scripts/quality/run-lint-domain-checks.mjs --include-test-tree --strict --ci --no-history` |
| Typecheck | PASS | 33.2s | 0 | `npm run typecheck` |
| Critical Flow Gate | PASS | 22.0s | 0 | `npm run test:critical-flows:strict -- --ci --no-history` |
| Security Smoke Gate | PASS | 8.1s | 0 | `npm run test:security-smoke:strict -- --ci --no-history` |
| Unit Domain Gate | PASS | 4.1m | 0 | `npm run test:unit:domains:strict -- --ci --no-history` |
| Full Unit Tests | SKIPPED | 0ms | - | `npm run test:unit` |
| E2E Tests | SKIPPED | 0ms | - | `npm run test:e2e` |
| Architecture Guardrails | PASS | 3.0s | 0 | `node scripts/architecture/check-guardrails.mjs` |
| UI Consolidation Guardrail | PASS | 2.4s | 0 | `node scripts/architecture/check-ui-consolidation.mjs` |
| Observability Check | PASS | 1.2s | 0 | `npm run observability:check` |
| Unsafe Patterns | PASS | 880ms | 0 | `node scripts/quality/check-unsafe-patterns.mjs --ci --no-history` |
| Import Boundaries | PASS | 368ms | 0 | `node scripts/quality/check-import-boundaries.mjs --ci --no-history` |
| API Input Validation | PASS | 187ms | 0 | `node scripts/quality/check-api-input-validation.mjs --ci --no-history` |
| Context Health | PASS | 519ms | 0 | `node scripts/quality/check-context-health.mjs --ci --no-history` |
| Timer Cleanup | PASS | 253ms | 0 | `node scripts/quality/check-timer-cleanup.mjs --ci --no-history` |
| Test Distribution | PASS | 247ms | 0 | `node scripts/quality/check-test-distribution.mjs --ci --no-history` |

## Guardrail Snapshot

## Trend Snapshot

- Weekly lane trend: runs=1, window=2026-03-05T00:31:37.152Z -> 2026-03-05T00:31:37.152Z, delta=n/a
- Unit-domain trend: runs=2, window=2026-03-05T03:33:16.314Z -> 2026-03-05T03:49:28.650Z, delta=+5.3s
- Lint-domain trend: runs=4, window=2026-03-05T04:00:57.270Z -> 2026-03-05T04:36:38.577Z, delta=+31.5s

## Duration Budget Alerts

- No duration budget alerts in this run.

- Prop forwarding components: 42
- Prop-drilling depth >=4 chains: 0
- UI opportunities: 0
- UI high-priority opportunities: 0
- Raw UI clusters: duplicate=0 | signature=0 | token=0

## Architecture and Performance Snapshot

- Source files: 5114
- Source lines: 832019
- API routes: 330
- Cross-feature edge pairs: 56
- Shared->features imports: 75
- Largest file: `src/features/kangur/cms-builder/project.ts` (2855 LOC)
- use client files: 1494
- setInterval occurrences: 22

## Top 5 Critical User Flows (Priority Order)

| Priority | Flow | KPI | Target | Scope |
| ---: | --- | --- | --- | --- |
| 1 | Authentication + Session Bootstrap | Successful sign-in completion rate | >= 99.5% | `src/features/auth + app entry routes` |
| 2 | Products CRUD + Listing Refresh | Create/edit success rate without retries | >= 99.0% | `src/features/products + products API routes` |
| 3 | Image Studio Generate + Preview | Generation completion under timeout budget | >= 98.0% | `src/features/ai/image-studio + runtime APIs` |
| 4 | AI Paths Run Execution | Run completion without fallback/error path | >= 98.5% | `src/features/ai/ai-paths + shared ai-path runtime` |
| 5 | Case Resolver OCR + Capture Mapping | Queue-to-review completion without manual recovery | >= 98.0% | `src/features/case-resolver + capture APIs` |

## Notes

- Pass rates are calculated from command exit status for this run (pass=100%, fail/timeout=0%).
- For full runtime/performance tuning, pair this report with profiling and production telemetry.
