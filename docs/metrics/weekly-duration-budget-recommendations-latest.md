# Weekly Duration Budget Recommendations

Generated at: 2026-03-08T17:25:10.214Z
Runs analyzed: 8
Calibration status: PARTIAL

## Calibration Settings

- Minimum pass samples per check: 8
- Percentile target: 90th
- Headroom: 20%
- Supplemental sample ingestion: enabled
- Samples (weekly/supplemental/total): 56/30/86
- Required checks: 10 (ready: 6, pending: 4)
- Optional checks: 2 (no samples: 2)
- Required passing runs still needed (minimum): 8
- Estimated readiness date (7-day cadence): 2026-05-03T17:23:59.018Z
- Current blocking checks: lint

## Application

- Apply requested: no
- Apply status: not-requested
- Apply target file: `scripts/quality/generate-weekly-report.mjs`

## Recommendations

| Check | Requirement | Current | Weekly | Supplemental | Samples | Need | ETA | Pctl | Max | Recommended | Delta | Status |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- |
| Build | required | 3.3m | 6 | 0 | 6 | 2 | 2026-03-22T17:23:59.018Z | 2.9m | 2.9m | 3.3m | 0ms | insufficient-data |
| Lint | required | 4.0m | 0 | 0 | 0 | 8 | 2026-05-03T17:23:59.018Z | n/a | n/a | 4.0m | 0ms | insufficient-data |
| Lint Domain Gate | required | 4.3m | 3 | 9 | 12 | 0 | 2026-03-08T17:23:59.018Z | 5.6m | 6.0m | 6.8m | +2.5m | ready |
| Typecheck | required | 2.0m | 8 | 0 | 8 | 0 | 2026-03-08T17:23:59.018Z | 59.7s | 1.1m | 2.0m | 0ms | ready |
| Critical Flow Gate | required | 1.0m | 7 | 12 | 19 | 0 | 2026-03-08T17:23:59.018Z | 37.0s | 51.4s | 1.0m | 0ms | ready |
| Security Smoke Gate | required | 1.0m | 7 | 5 | 12 | 0 | 2026-03-08T17:23:59.018Z | 13.0s | 34.8s | 1.0m | 0ms | ready |
| Unit Domain Gate | required | 10.0m | 6 | 4 | 10 | 0 | 2026-03-08T17:23:59.018Z | 5.6m | 5.6m | 10.0m | 0ms | ready |
| Full Unit Tests | optional | 25.0m | 0 | 0 | 0 | 8 | - | n/a | n/a | 25.0m | 0ms | optional |
| E2E Tests | optional | 40.0m | 0 | 0 | 0 | 8 | - | n/a | n/a | 40.0m | 0ms | optional |
| Architecture Guardrails | required | 1.0m | 4 | 0 | 4 | 4 | 2026-04-05T17:23:59.018Z | 5.0s | 5.1s | 1.0m | 0ms | insufficient-data |
| UI Consolidation Guardrail | required | 1.0m | 7 | 0 | 7 | 1 | 2026-03-15T17:23:59.018Z | 4.4s | 5.1s | 1.0m | 0ms | insufficient-data |
| Observability Check | required | 30.0s | 8 | 0 | 8 | 0 | 2026-03-08T17:23:59.018Z | 1.3s | 1.3s | 30.0s | 0ms | ready |

## Notes

- Recommendations are computed from passing check durations only.
- `--apply-budgets` updates weekly budget constants only when all checks are ready.
- Pending status means there is not enough historical data for at least one check.
