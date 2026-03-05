# Weekly Quality Report

Generated at: 2026-03-05T03:11:43.736Z
Node: v22.13.0

## Quality Check Summary

- Total checks: 10
- Passed: 4
- Failed: 4
- Timed out: 0
- Skipped: 2

## Baseline Status

- Build pass rate: 0%
- Build preflight: removed (Removed stale .next/lock before running build check.)
- Lint pass rate: 0%
- Typecheck pass rate: 0%
- Critical-flow gate pass rate: 100%
- Security smoke gate pass rate: 100%
- Full unit pass rate: n/a%
- E2E test pass rate: n/a%

Full unit suite was skipped in this run. Use `--include-full-unit` to include full unit coverage in baseline.

E2E tests were skipped in this run. Use `--include-e2e` for full end-to-end baseline.

## Check Details

| Check | Status | Duration | Exit | Command |
| --- | --- | ---: | ---: | --- |
| Build | FAIL | 1.6m | 1 | `npm run build` |
| Lint | FAIL | 2.0m | 1 | `npm run lint` |
| Typecheck | FAIL | 38.3s | 2 | `npm run typecheck` |
| Critical Flow Gate | PASS | 12.6s | 0 | `npm run test:critical-flows:strict -- --ci --no-history` |
| Security Smoke Gate | PASS | 8.6s | 0 | `npm run test:security-smoke:strict -- --ci --no-history` |
| Full Unit Tests | SKIPPED | 0ms | - | `npm run test:unit` |
| E2E Tests | SKIPPED | 0ms | - | `npm run test:e2e` |
| Architecture Guardrails | FAIL | 4.4s | 1 | `node scripts/architecture/check-guardrails.mjs` |
| UI Consolidation Guardrail | PASS | 3.2s | 0 | `node scripts/architecture/check-ui-consolidation.mjs` |
| Observability Check | PASS | 717ms | 0 | `npm run observability:check` |

## Guardrail Snapshot

- Prop forwarding components: 0
- Prop-drilling depth >=4 chains: 0
- UI opportunities: 0
- UI high-priority opportunities: 0
- Raw UI clusters: duplicate=0 | signature=0 | token=0

## Architecture and Performance Snapshot

- Source files: 4217
- Source lines: 664571
- API routes: 307
- Cross-feature edge pairs: 71
- Shared->features imports: 11
- Largest file: `src/features/case-resolver/__tests__/workspace.test.ts` (1802 LOC)
- use client files: 1306
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
