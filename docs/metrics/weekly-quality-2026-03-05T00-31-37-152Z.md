# Weekly Quality Report

Generated at: 2026-03-05T00:31:37.152Z
Node: v22.13.0

## Quality Check Summary

- Total checks: 8
- Passed: 4
- Failed: 3
- Timed out: 0
- Skipped: 1

## Baseline Status

- Build pass rate: 0%
- Lint pass rate: 0%
- Typecheck pass rate: 100%
- Unit test pass rate: 0%
- E2E test pass rate: n/a%

E2E tests were skipped in this run. Use `--include-e2e` for full end-to-end baseline.

## Check Details

| Check | Status | Duration | Exit | Command |
| --- | --- | ---: | ---: | --- |
| Build | FAIL | 3.7s | 1 | `npm run build` |
| Lint | FAIL | 2.0m | 1 | `npm run lint` |
| Typecheck | PASS | 40.2s | 0 | `npm run typecheck` |
| Unit Tests | FAIL | 9.1m | - | `npm run test:unit` |
| E2E Tests | SKIPPED | 0ms | - | `npm run test:e2e` |
| Architecture Guardrails | PASS | 2.7s | 0 | `node scripts/architecture/check-guardrails.mjs` |
| UI Consolidation Guardrail | PASS | 2.1s | 0 | `node scripts/architecture/check-ui-consolidation.mjs` |
| Observability Check | PASS | 548ms | 0 | `npm run observability:check` |

## Guardrail Snapshot

- Prop forwarding components: 0
- Prop-drilling depth >=4 chains: 0
- UI opportunities: 0
- UI high-priority opportunities: 0
- Raw UI clusters: duplicate=0 | signature=0 | token=0

## Architecture and Performance Snapshot

- Source files: 4250
- Source lines: 659211
- API routes: 307
- Cross-feature edge pairs: 71
- Shared->features imports: 11
- Largest file: `src/features/case-resolver/__tests__/workspace.test.ts` (1802 LOC)
- use client files: 1317
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
