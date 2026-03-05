# Weekly Duration Budget Recommendations

Generated at: 2026-03-05T05:38:20.935Z
Runs analyzed: 2
Calibration status: PENDING

## Calibration Settings

- Minimum pass samples per check: 8
- Percentile target: 90th
- Headroom: 20%
- Supplemental sample ingestion: enabled
- Samples (weekly/supplemental/total): 8/9/17
- Required checks: 10 (ready: 0, pending: 10)
- Optional checks: 2 (no samples: 2)
- Required passing runs still needed (minimum): 8
- Estimated readiness date (7-day cadence): 2026-04-30T03:11:43.736Z
- Current blocking checks: build, lint

## Application

- Apply requested: yes
- Apply status: skipped
- Apply target file: `scripts/quality/generate-weekly-report.mjs`
- Apply reason: Calibration status is pending; all checks must be ready before apply.

## Recommendations

| Check | Requirement | Current | Weekly | Supplemental | Samples | Need | ETA | Pctl | Max | Recommended | Delta | Status |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- |
| Build | required | 3.0m | 0 | 0 | 0 | 8 | 2026-04-30T03:11:43.736Z | n/a | n/a | 3.0m | 0ms | insufficient-data |
| Lint | required | 4.0m | 0 | 0 | 0 | 8 | 2026-04-30T03:11:43.736Z | n/a | n/a | 4.0m | 0ms | insufficient-data |
| Lint Domain Gate | required | 3.0m | 0 | 3 | 3 | 5 | 2026-04-09T03:11:43.736Z | 2.2m | 2.3m | 3.0m | 0ms | insufficient-data |
| Typecheck | required | 2.0m | 1 | 0 | 1 | 7 | 2026-04-23T03:11:43.736Z | 40.2s | 40.2s | 2.0m | 0ms | insufficient-data |
| Critical Flow Gate | required | 1.0m | 1 | 3 | 4 | 4 | 2026-04-02T03:11:43.736Z | 17.1s | 19.1s | 1.0m | 0ms | insufficient-data |
| Security Smoke Gate | required | 1.0m | 1 | 2 | 3 | 5 | 2026-04-09T03:11:43.736Z | 29.5s | 34.8s | 1.0m | 0ms | insufficient-data |
| Unit Domain Gate | required | 10.0m | 0 | 1 | 1 | 7 | 2026-04-23T03:11:43.736Z | 4.6m | 4.6m | 10.0m | 0ms | insufficient-data |
| Full Unit Tests | optional | 25.0m | 0 | 0 | 0 | 8 | - | n/a | n/a | 25.0m | 0ms | optional |
| E2E Tests | optional | 40.0m | 0 | 0 | 0 | 8 | - | n/a | n/a | 40.0m | 0ms | optional |
| Architecture Guardrails | required | 1.0m | 1 | 0 | 1 | 7 | 2026-04-23T03:11:43.736Z | 2.7s | 2.7s | 1.0m | 0ms | insufficient-data |
| UI Consolidation Guardrail | required | 1.0m | 2 | 0 | 2 | 6 | 2026-04-16T03:11:43.736Z | 3.1s | 3.2s | 1.0m | 0ms | insufficient-data |
| Observability Check | required | 30.0s | 2 | 0 | 2 | 6 | 2026-04-16T03:11:43.736Z | 700ms | 717ms | 30.0s | 0ms | insufficient-data |

## Notes

- Recommendations are computed from passing check durations only.
- `--apply-budgets` updates weekly budget constants only when all checks are ready.
- Pending status means there is not enough historical data for at least one check.
