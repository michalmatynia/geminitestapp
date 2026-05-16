---
owner: 'Platform Team'
last_reviewed: '2026-05-06'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Testing Suite Inventory

Generated at: 2026-05-06T11:43:58.900Z

## Summary

- Registered suites: 17
- Registered lanes: 5
- Major lanes requiring ledger updates: 4
- Suites with summary-json support: 11

## Cadence Coverage

| Cadence | Suite count |
| --- | ---: |
| local | 2 |
| nightly | 9 |
| pr | 7 |
| release | 9 |
| weekly | 8 |

## Lanes

| Lane | Cadence | Ledger | Suites |
| --- | --- | --- | --- |
| Local Fast Confidence (`local-fast`) | on-demand | optional | `typecheck`, `critical-flows` |
| Pull Request Required (`pr-required`) | pull-request | required | `lint`, `typecheck`, `unit`, `critical-flows`, `security-smoke`, `accessibility-smoke`, `integration-mongo` |
| Nightly Deep Regression (`nightly-deep`) | nightly | required | `lint-domains`, `unit-domains`, `critical-flows`, `security-smoke`, `accessibility-smoke`, `accessibility-route-crawl`, `integration-mongo-baseline`, `high-risk-coverage`, `e2e` |
| Weekly Audit And Trend (`weekly-audit`) | weekly | required | `weekly-quality-report`, `integration-mongo-baseline`, `high-risk-coverage`, `test-distribution`, `test-quality-snapshot` |
| Release Gate (`release-gate`) | release | required | `build`, `typecheck`, `unit`, `critical-flows`, `security-smoke`, `accessibility-smoke`, `integration-mongo`, `e2e` |

## Suites

| Suite | Kind | Cadence | Cost | Summary JSON | Artifacts |
| --- | --- | --- | --- | --- | --- |
| Lint (`lint`) | static-analysis | pr, release | medium | no | - |
| Lint Domain Gate (`lint-domains`) | static-analysis | nightly, weekly | high | yes | `docs/metrics/lint-domain-checks-latest.json`, `docs/metrics/lint-domain-checks-latest.md` |
| Typecheck (`typecheck`) | static-analysis | local, pr, release | medium | no | - |
| Production Build (`build`) | build | release | high | no | - |
| Vitest Unit Project (`unit`) | unit | pr, release | high | no | - |
| Unit Domain Timings (`unit-domains`) | unit | nightly, weekly | high | yes | `docs/metrics/unit-domain-timings-latest.json`, `docs/metrics/unit-domain-timings-latest.md` |
| Critical Flow Regression (`critical-flows`) | regression | local, pr, nightly, release | medium | yes | `docs/metrics/critical-flow-tests-latest.json`, `docs/metrics/critical-flow-tests-latest.md` |
| Security Smoke (`security-smoke`) | security | pr, nightly, release | medium | yes | `docs/metrics/security-smoke-latest.json`, `docs/metrics/security-smoke-latest.md` |
| Accessibility Smoke (`accessibility-smoke`) | accessibility | pr, nightly, release | medium | yes | `docs/metrics/accessibility-smoke-latest.json`, `docs/metrics/accessibility-smoke-latest.md` |
| Accessibility Route Crawl (`accessibility-route-crawl`) | accessibility | nightly, weekly | high | yes | `docs/metrics/accessibility-route-crawl-latest.json`, `docs/metrics/accessibility-route-crawl-latest.md` |
| Mongo Integration Project (`integration-mongo`) | integration | pr, release | high | no | - |
| Mongo Integration Baseline (`integration-mongo-baseline`) | integration | nightly, weekly | high | yes | `docs/metrics/integration-mongo-latest.json`, `docs/metrics/integration-mongo-latest.md` |
| High-Risk Coverage Baseline (`high-risk-coverage`) | coverage | nightly, weekly | high | yes | `docs/metrics/high-risk-coverage-latest.json`, `docs/metrics/high-risk-coverage-latest.md` |
| Test Distribution Scan (`test-distribution`) | quality | weekly | low | yes | `docs/metrics/test-distribution-latest.json`, `docs/metrics/test-distribution-latest.md` |
| Testing Quality Snapshot (`test-quality-snapshot`) | quality | weekly | low | yes | `docs/metrics/testing-quality-snapshot-latest.json`, `docs/metrics/testing-quality-snapshot-latest.md` |
| Playwright End-to-End (`e2e`) | e2e | nightly, release | high | no | - |
| Weekly Quality Report (`weekly-quality-report`) | quality | weekly | high | yes | `docs/metrics/weekly-quality-latest.json`, `docs/metrics/weekly-quality-latest.md` |

## Notes

- The registry in `scripts/testing/config/test-suite-registry.mjs` is the canonical source for lane membership and cadence.
- Large runs should update `testing-run-ledger-latest.*` either automatically through the lane runner or manually through `npm run testing:record`.
