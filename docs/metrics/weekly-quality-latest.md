---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Weekly Quality Report

Generated at: 2026-03-26T12:51:04.756Z
Node: v22.22.0

## Quality Check Summary

- Total checks: 18
- Executed checks: 15
- Passed: 8
- Failed: 7
- Timed out: 0
- Skipped: 3
- Other skipped: 3

## Baseline Status

- Build pass rate: 0%
- Lint pass rate: n/a%
- Lint-domain pass rate: 0%
- Typecheck pass rate: 0%
- Critical-flow gate pass rate: 100%
- Security smoke gate pass rate: 100%
- Unit-domain gate pass rate: 0%
- Full unit pass rate: n/a%
- E2E test pass rate: n/a%
- Duration budget alerts: 2

Full repository lint was skipped in this run. Use `--include-full-lint` to include the broad `eslint src` sweep.

Full unit suite was skipped in this run. Use `--include-full-unit` to include full unit coverage in baseline.

E2E tests were skipped in this run. Use `--include-e2e` for full end-to-end baseline.

## Check Details

| Check | Status | Duration | Exit | Command |
| --- | --- | ---: | ---: | --- |
| Build | FAIL | 3.5m | 1 | `npm run build` |
| Lint | SKIPPED | 0ms | - | `npm run lint` |
| Lint Domain Gate | FAIL | 1.7m | 1 | `node scripts/quality/run-lint-domain-checks.mjs --include-test-tree --strict --ci --no-history --summary-json` |
| Typecheck | FAIL | 2.1m | 2 | `npm run typecheck` |
| Critical Flow Gate | PASS | 30.1s | 0 | `node scripts/testing/run-critical-flow-tests.mjs --strict --ci --no-history --summary-json` |
| Security Smoke Gate | PASS | 8.4s | 0 | `node scripts/testing/run-security-smoke-tests.mjs --strict --ci --no-history --summary-json` |
| Unit Domain Gate | FAIL | 7.8m | 1 | `node scripts/testing/run-unit-domain-timings.mjs --strict --ci --no-history --summary-json` |
| Full Unit Tests | SKIPPED | 0ms | - | `npm run test:unit` |
| E2E Tests | SKIPPED | 0ms | - | `node scripts/testing/run-playwright-suite.mjs --summary-json --no-write --ci` |
| Architecture Guardrails | FAIL | 5.1s | 1 | `node scripts/architecture/check-guardrails.mjs --summary-json` |
| UI Consolidation Guardrail | FAIL | 4.5s | 1 | `node scripts/architecture/check-ui-consolidation.mjs --summary-json` |
| Observability Check | FAIL | 1.2s | 1 | `node scripts/observability/check-observability.mjs --mode=check --summary-json` |
| Unsafe Patterns | PASS | 1.2s | 0 | `node scripts/quality/check-unsafe-patterns.mjs --ci --no-history` |
| Import Boundaries | PASS | 442ms | 0 | `node scripts/quality/check-import-boundaries.mjs --ci --no-history` |
| API Input Validation | PASS | 181ms | 0 | `node scripts/quality/check-api-input-validation.mjs --ci --no-history` |
| Context Health | PASS | 543ms | 0 | `node scripts/quality/check-context-health.mjs --ci --no-history` |
| Timer Cleanup | PASS | 387ms | 0 | `node scripts/quality/check-timer-cleanup.mjs --ci --no-history` |
| Test Distribution | PASS | 569ms | 0 | `node scripts/quality/check-test-distribution.mjs --ci --no-history` |

## Guardrail Snapshot

- Stabilization aggregate: FAIL (refreshed 2026-03-26T12:51:02.743Z)
- Canonical stabilization: pass | runtime files=5819 | docs=4
- AI stabilization: fail | source files=7788
- Observability stabilization: not-run | legacyCompatViolations=n/a | runtimeErrors=n/a

## Trend Snapshot

- Weekly lane trend: runs=10, window=2026-03-09T06:12:30.508Z -> 2026-03-09T09:07:34.294Z, delta=+10.4s
- Unit-domain trend: runs=2, window=2026-03-05T03:33:16.314Z -> 2026-03-05T03:49:28.650Z, delta=+5.3s
- Lint-domain trend: runs=4, window=2026-03-05T04:00:57.270Z -> 2026-03-05T04:36:38.577Z, delta=+31.5s

## Duration Budget Alerts

| Check | Duration | Budget | Delta |
| --- | ---: | ---: | ---: |
| Build | 3.5m | 3.3m | +17.1s |
| Typecheck | 2.1m | 2.0m | +8.3s |

- Prop forwarding components: 120
- Prop-drilling depth >=4 chains: 58
- UI opportunities: 0
- UI high-priority opportunities: 0
- Raw UI clusters: duplicate=0 | signature=0 | token=0

## Architecture and Performance Snapshot

- Source files: 7788
- Source lines: 1299584
- API routes: 29
- Cross-feature edge pairs: 2
- Shared->features imports: 0
- Largest file: `src/app/(frontend)/products/[id]/ProductPublicPage.tsx` (301 LOC)
- use client files: 2
- setInterval occurrences: 1

## Kangur AI Tutor Bridge Snapshot

- Range: 7d
- Overall status: insufficient_data
- Tutor replies: 0
- Neo4j-backed replies: 0
- Graph coverage rate: n/a
- Graph mode split: semantic=0 | website-help=0
- Recall mix: metadata=0 | hybrid=0 | vector-only=0
- Vector assist rate: n/a | attempts=0
- Bridge suggestions: 0
- Direction split: lesson->game=0 | game->lesson=0
- Bridge CTA clicks: 0
- Bridge follow-up opens: 0
- Bridge completions: 0
- Bridge completion rate: n/a | alert=insufficient_data

## Kangur Knowledge Graph Status

- Kangur knowledge graph status unavailable; inspect JSON payload for error details.

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
