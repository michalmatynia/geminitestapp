---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Weekly Duration Budget Recommendations

Generated at: 2026-03-05T05:23:21.216Z
Runs analyzed: 2
Calibration status: PENDING

## Calibration Settings

- Minimum pass samples per check: 8
- Percentile target: 90th
- Headroom: 20%
- Required checks: 10 (ready: 0, pending: 10)
- Optional checks: 2 (no samples: 2)
- Required passing runs still needed (minimum): 8
- Current blocking checks: build, lint, lintDomains, unitDomains

## Application

- Apply requested: yes
- Apply status: skipped
- Apply target file: `scripts/quality/generate-weekly-report.mjs`
- Apply reason: Calibration status is pending; all checks must be ready before apply.

## Recommendations

| Check | Requirement | Current | Samples | Need | Pctl | Max | Recommended | Delta | Status |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Build | required | 3.0m | 0 | 8 | n/a | n/a | 3.0m | 0ms | insufficient-data |
| Lint | required | 4.0m | 0 | 8 | n/a | n/a | 4.0m | 0ms | insufficient-data |
| Lint Domain Gate | required | 3.0m | 0 | 8 | n/a | n/a | 3.0m | 0ms | insufficient-data |
| Typecheck | required | 2.0m | 1 | 7 | 40.2s | 40.2s | 2.0m | 0ms | insufficient-data |
| Critical Flow Gate | required | 1.0m | 1 | 7 | 12.6s | 12.6s | 1.0m | 0ms | insufficient-data |
| Security Smoke Gate | required | 1.0m | 1 | 7 | 8.6s | 8.6s | 1.0m | 0ms | insufficient-data |
| Unit Domain Gate | required | 10.0m | 0 | 8 | n/a | n/a | 10.0m | 0ms | insufficient-data |
| Full Unit Tests | optional | 25.0m | 0 | 8 | n/a | n/a | 25.0m | 0ms | optional |
| E2E Tests | optional | 40.0m | 0 | 8 | n/a | n/a | 40.0m | 0ms | optional |
| Architecture Guardrails | required | 1.0m | 1 | 7 | 2.7s | 2.7s | 1.0m | 0ms | insufficient-data |
| UI Consolidation Guardrail | required | 1.0m | 2 | 6 | 3.1s | 3.2s | 1.0m | 0ms | insufficient-data |
| Observability Check | required | 30.0s | 2 | 6 | 700ms | 717ms | 30.0s | 0ms | insufficient-data |

## Notes

- Recommendations are computed from passing check durations only.
- `--apply-budgets` updates weekly budget constants only when all checks are ready.
- Pending status means there is not enough historical data for at least one check.
