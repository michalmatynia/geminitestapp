---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Weekly Duration Budget Recommendations

Generated at: 2026-03-26T12:51:55.172Z
Runs analyzed: 20
Calibration status: READY

## Calibration Settings

- Minimum pass samples per check: 8
- Percentile target: 90th
- Headroom: 20%
- Supplemental sample ingestion: enabled
- Samples (weekly/supplemental/total): 137/28/165
- Required checks: 9 (ready: 9, pending: 0)
- Optional checks: 3 (no samples: 3)
- Required passing runs still needed (minimum): 0
- Estimated readiness date (7-day cadence): 2026-03-26T12:51:04.756Z

## Application

- Apply requested: no
- Apply status: not-requested
- Apply target file: `scripts/quality/generate-weekly-report.mjs`

## Recommendations

| Check | Requirement | Current | Weekly | Supplemental | Samples | Need | ETA | Pctl | Max | Recommended | Delta | Status |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- |
| Build | required | 3.3m | 13 | 0 | 13 | 0 | 2026-03-26T12:51:04.756Z | 2.9m | 5.4m | 6.0m | +2.7m | ready |
| Lint | optional | 4.0m | 0 | 0 | 0 | 8 | - | n/a | n/a | 4.0m | 0ms | optional |
| Lint Domain Gate | required | 6.8m | 11 | 8 | 19 | 0 | 2026-03-26T12:51:04.756Z | 3.8m | 6.0m | 6.8m | 0ms | ready |
| Typecheck | required | 2.0m | 13 | 0 | 13 | 0 | 2026-03-26T12:51:04.756Z | 1.1m | 2.6m | 2.9m | +52.0s | ready |
| Critical Flow Gate | required | 1.0m | 20 | 12 | 32 | 0 | 2026-03-26T12:51:04.756Z | 36.9s | 51.4s | 1.0m | 0ms | ready |
| Security Smoke Gate | required | 1.0m | 20 | 5 | 25 | 0 | 2026-03-26T12:51:04.756Z | 12.4s | 34.8s | 1.0m | 0ms | ready |
| Unit Domain Gate | required | 10.0m | 15 | 3 | 18 | 0 | 2026-03-26T12:51:04.756Z | 5.6m | 7.4m | 10.0m | 0ms | ready |
| Full Unit Tests | optional | 25.0m | 0 | 0 | 0 | 8 | - | n/a | n/a | 25.0m | 0ms | optional |
| E2E Tests | optional | 40.0m | 0 | 0 | 0 | 8 | - | n/a | n/a | 40.0m | 0ms | optional |
| Architecture Guardrails | required | 1.0m | 10 | 0 | 10 | 0 | 2026-03-26T12:51:04.756Z | 5.6s | 8.6s | 1.0m | 0ms | ready |
| UI Consolidation Guardrail | required | 1.0m | 16 | 0 | 16 | 0 | 2026-03-26T12:51:04.756Z | 5.4s | 10.4s | 1.0m | 0ms | ready |
| Observability Check | required | 30.0s | 19 | 0 | 19 | 0 | 2026-03-26T12:51:04.756Z | 1.8s | 4.6s | 30.0s | 0ms | ready |

## Notes

- Recommendations are computed from passing check durations only.
- `--apply-budgets` updates weekly budget constants only when all checks are ready.
- Pending status means there is not enough historical data for at least one check.
