# Weekly Duration Budget Recommendations

Generated at: 2026-03-07T20:07:30.553Z
Runs analyzed: 6
Calibration status: PARTIAL

## Calibration Settings

- Minimum pass samples per check: 8
- Percentile target: 90th
- Headroom: 20%
- Supplemental sample ingestion: enabled
- Samples (weekly/supplemental/total): 44/30/74
- Required checks: 10 (ready: 4, pending: 6)
- Optional checks: 2 (no samples: 2)
- Required passing runs still needed (minimum): 7
- Estimated readiness date (7-day cadence): 2026-04-25T20:07:02.037Z
- Current blocking checks: lint

## Application

- Apply requested: no
- Apply status: not-requested
- Apply target file: `scripts/quality/generate-weekly-report.mjs`

## Recommendations

| Check | Requirement | Current | Weekly | Supplemental | Samples | Need | ETA | Pctl | Max | Recommended | Delta | Status |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- |
| Build | required | 3.0m | 5 | 0 | 5 | 3 | 2026-03-28T20:07:02.037Z | 3.0m | 3.1m | 3.0m | 0ms | insufficient-data |
| Lint | required | 4.0m | 1 | 0 | 1 | 7 | 2026-04-25T20:07:02.037Z | 2.7m | 2.7m | 4.0m | 0ms | insufficient-data |
| Lint Domain Gate | required | 3.0m | 3 | 9 | 12 | 0 | 2026-03-07T20:07:02.037Z | 3.6m | 3.7m | 4.3m | +1.3m | ready |
| Typecheck | required | 2.0m | 6 | 0 | 6 | 2 | 2026-03-21T20:07:02.037Z | 50.2s | 51.3s | 2.0m | 0ms | insufficient-data |
| Critical Flow Gate | required | 1.0m | 5 | 12 | 17 | 0 | 2026-03-07T20:07:02.037Z | 33.7s | 37.6s | 1.0m | 0ms | ready |
| Security Smoke Gate | required | 1.0m | 5 | 5 | 10 | 0 | 2026-03-07T20:07:02.037Z | 13.7s | 34.8s | 1.0m | 0ms | ready |
| Unit Domain Gate | required | 10.0m | 4 | 4 | 8 | 0 | 2026-03-07T20:07:02.037Z | 5.4m | 5.4m | 10.0m | 0ms | ready |
| Full Unit Tests | optional | 25.0m | 0 | 0 | 0 | 8 | - | n/a | n/a | 25.0m | 0ms | optional |
| E2E Tests | optional | 40.0m | 0 | 0 | 0 | 8 | - | n/a | n/a | 40.0m | 0ms | optional |
| Architecture Guardrails | required | 1.0m | 3 | 0 | 3 | 5 | 2026-04-11T20:07:02.037Z | 4.9s | 5.1s | 1.0m | 0ms | insufficient-data |
| UI Consolidation Guardrail | required | 1.0m | 6 | 0 | 6 | 2 | 2026-03-21T20:07:02.037Z | 4.4s | 5.1s | 1.0m | 0ms | insufficient-data |
| Observability Check | required | 30.0s | 6 | 0 | 6 | 2 | 2026-03-21T20:07:02.037Z | 1.3s | 1.3s | 30.0s | 0ms | insufficient-data |

## Notes

- Recommendations are computed from passing check durations only.
- `--apply-budgets` updates weekly budget constants only when all checks are ready.
- Pending status means there is not enough historical data for at least one check.
