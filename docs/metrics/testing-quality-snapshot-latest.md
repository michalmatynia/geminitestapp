---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Testing Quality Snapshot

Generated at: 2026-03-28T14:56:01.652Z

## Summary

- Status: FAIL
- Repo test files: 2712
- E2E specs: 56
- Script/runtime tests: 91
- Registered suites: 17
- Registered lanes: 5
- Major lanes: 4
- Recorded major runs: 0
- Latest recorded run: n/a
- Features without tests: 0
- Features without fast tests: 0
- Features without negative-path tests: 0
- .only() occurrences: 0
- .skip() occurrences: 32
- .todo() occurrences: 0
- Failing baselines: 4
- Missing baselines: 0
- Required failing baselines: 2
- Required missing baselines: 0
- Aging baselines: 6
- Stale baselines: 0

## Lane Registry

| Lane | Cadence | Ledger | Suites |
| --- | --- | --- | --- |
| Local Fast Confidence (`local-fast`) | on-demand | optional | `typecheck`, `critical-flows` |
| Pull Request Required (`pr-required`) | pull-request | required | `lint`, `typecheck`, `unit`, `critical-flows`, `security-smoke`, `accessibility-smoke`, `integration-mongo` |
| Nightly Deep Regression (`nightly-deep`) | nightly | required | `lint-domains`, `unit-domains`, `critical-flows`, `security-smoke`, `accessibility-smoke`, `accessibility-route-crawl`, `integration-mongo-baseline`, `high-risk-coverage`, `e2e` |
| Weekly Audit And Trend (`weekly-audit`) | weekly | required | `weekly-quality-report`, `integration-mongo-baseline`, `high-risk-coverage`, `test-distribution`, `test-quality-snapshot` |
| Release Gate (`release-gate`) | release | required | `build`, `typecheck`, `unit`, `critical-flows`, `security-smoke`, `accessibility-smoke`, `integration-mongo`, `e2e` |

## Recorded Run Ledger

- No major test runs have been recorded in the ledger yet.

## Baseline Status

| Baseline | Required | Status | Pass rate | Passed / Total | Duration | Age | Source |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| Unit Domain Gate | yes | FAIL | 80% | 4 / 5 | 7.8m | 2.1d | `docs/metrics/unit-domain-timings-latest.json` |
| Critical Flow Gate | yes | PASS | 100% | 6 / 6 | 30.0s | 2.1d | `docs/metrics/critical-flow-tests-latest.json` |
| Security Smoke Gate | yes | PASS | 100% | 5 / 5 | 8.4s | 2.1d | `docs/metrics/security-smoke-latest.json` |
| High-Risk Coverage Gate | no | FAIL | n/a | n/a | 43ms | 24.0h | `docs/metrics/high-risk-coverage-latest.json` |
| Accessibility Smoke Gate | yes | FAIL | 85.7% | 12 / 14 | 10.8m | 2.1d | `docs/metrics/accessibility-smoke-latest.json` |
| Accessibility Route Crawl | no | FAIL | 93.8% | 30 / 32 | 27.8m | 2.1d | `docs/metrics/accessibility-route-crawl-latest.json` |
| Mongo Integration Baseline | no | PASS | 100% | 1 / 1 | 3.9s | 2.1d | `docs/metrics/integration-mongo-latest.json` |

## Slowest Tracked Suites

| Baseline | Suite | Status | Duration |
| --- | --- | --- | ---: |
| Unit Domain Gate | AI Paths | PASS | 3.3m |
| Accessibility Route Crawl | Admin Kangur Appearance | PASS | 2.5m |
| Accessibility Smoke Gate | Case Resolver Accessibility | PASS | 2.4m |
| Accessibility Smoke Gate | CMS Builder Accessibility | PASS | 2.2m |
| Accessibility Smoke Gate | CMS Pages Accessibility | FAIL | 2.1m |
| Accessibility Route Crawl | Admin Kangur Builder | PASS | 2.0m |
| Accessibility Route Crawl | Kangur Tests | PASS | 2.0m |
| Accessibility Route Crawl | Kangur Parent Dashboard | PASS | 1.8m |
| Unit Domain Gate | Products | FAIL | 1.8m |
| Accessibility Route Crawl | Public Home | PASS | 1.8m |
| Accessibility Route Crawl | Admin Kangur | PASS | 1.6m |
| Unit Domain Gate | Case Resolver | PASS | 1.5m |
| Accessibility Route Crawl | Kangur Duels | PASS | 1.4m |
| Accessibility Smoke Gate | Products List Accessibility | PASS | 1.2m |
| Accessibility Smoke Gate | Notes Workspace Accessibility | PASS | 1.2m |
| Accessibility Route Crawl | Kangur Game | PASS | 1.2m |
| Accessibility Route Crawl | Admin AI Paths | PASS | 1.2m |
| Accessibility Route Crawl | Admin Kangur Lessons Manager | PASS | 1.1m |
| Unit Domain Gate | Image Studio | PASS | 59.7s |
| Accessibility Route Crawl | Admin Dashboard | PASS | 58.3s |

## Coverage Gaps

- No missing baseline artifacts or feature-level test gaps detected.

## Notes

- This snapshot aggregates generated latest metrics instead of rerunning every lane itself.
- Unit domains, critical flows, and security smoke become fresh when the weekly quality lane runs.
- Integration baselines stay advisory until a dedicated `integration-mongo-latest.json` artifact exists.
