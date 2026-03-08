# Weekly Duration Budget Recommendations

Generated at: 2026-03-08T19:34:26.735Z
Runs analyzed: 14
Calibration status: READY

## Calibration Settings

- Minimum pass samples per check: 8
- Percentile target: 90th
- Headroom: 20%
- Supplemental sample ingestion: enabled
- Samples (weekly/supplemental/total): 103/30/133
- Required checks: 9 (ready: 9, pending: 0)
- Optional checks: 3 (no samples: 3)
- Required passing runs still needed (minimum): 0
- Estimated readiness date (7-day cadence): 2026-03-08T19:27:19.918Z

## Application

- Apply requested: no
- Apply status: not-requested
- Apply target file: `scripts/quality/generate-weekly-report.mjs`

## Recommendations

| Check | Requirement | Current | Weekly | Supplemental | Samples | Need | ETA | Pctl | Max | Recommended | Delta | Status |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- |
| Build | required | 3.3m | 9 | 0 | 9 | 0 | 2026-03-08T19:27:19.918Z | 3.4m | 5.4m | 6.0m | +2.7m | ready |
| Lint | optional | 4.0m | 0 | 0 | 0 | 8 | - | n/a | n/a | 4.0m | 0ms | optional |
| Lint Domain Gate | required | 6.8m | 7 | 9 | 16 | 0 | 2026-03-08T19:27:19.918Z | 4.0m | 6.0m | 6.8m | 0ms | ready |
| Typecheck | required | 2.0m | 13 | 0 | 13 | 0 | 2026-03-08T19:27:19.918Z | 1.1m | 2.6m | 2.9m | +52.0s | ready |
| Critical Flow Gate | required | 1.0m | 13 | 12 | 25 | 0 | 2026-03-08T19:27:19.918Z | 36.9s | 51.4s | 1.0m | 0ms | ready |
| Security Smoke Gate | required | 1.0m | 13 | 5 | 18 | 0 | 2026-03-08T19:27:19.918Z | 11.9s | 34.8s | 1.0m | 0ms | ready |
| Unit Domain Gate | required | 10.0m | 12 | 4 | 16 | 0 | 2026-03-08T19:27:19.918Z | 5.6m | 7.4m | 10.0m | 0ms | ready |
| Full Unit Tests | optional | 25.0m | 0 | 0 | 0 | 8 | - | n/a | n/a | 25.0m | 0ms | optional |
| E2E Tests | optional | 40.0m | 0 | 0 | 0 | 8 | - | n/a | n/a | 40.0m | 0ms | optional |
| Architecture Guardrails | required | 1.0m | 9 | 0 | 9 | 0 | 2026-03-08T19:27:19.918Z | 5.9s | 8.6s | 1.0m | 0ms | ready |
| UI Consolidation Guardrail | required | 1.0m | 13 | 0 | 13 | 0 | 2026-03-08T19:27:19.918Z | 6.6s | 10.4s | 1.0m | 0ms | ready |
| Observability Check | required | 30.0s | 14 | 0 | 14 | 0 | 2026-03-08T19:27:19.918Z | 2.1s | 4.6s | 30.0s | 0ms | ready |

## Notes

- Recommendations are computed from passing check durations only.
- `--apply-budgets` updates weekly budget constants only when all checks are ready.
- Pending status means there is not enough historical data for at least one check.
