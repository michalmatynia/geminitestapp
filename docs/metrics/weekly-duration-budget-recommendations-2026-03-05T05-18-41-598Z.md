# Weekly Duration Budget Recommendations

Generated at: 2026-03-05T05:18:41.598Z
Runs analyzed: 2
Calibration status: PENDING

## Calibration Settings

- Minimum pass samples per check: 8
- Percentile target: 90th
- Headroom: 20%

## Application

- Apply requested: yes
- Apply status: skipped
- Apply target file: `scripts/quality/generate-weekly-report.mjs`
- Apply reason: Calibration status is pending; all checks must be ready before apply.

## Recommendations

| Check | Current | Samples | Pctl | Max | Recommended | Delta | Status |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Build | 3.0m | 0 | n/a | n/a | 3.0m | 0ms | insufficient-data |
| Lint | 4.0m | 0 | n/a | n/a | 4.0m | 0ms | insufficient-data |
| Lint Domain Gate | 3.0m | 0 | n/a | n/a | 3.0m | 0ms | insufficient-data |
| Typecheck | 2.0m | 1 | 40.2s | 40.2s | 2.0m | 0ms | insufficient-data |
| Critical Flow Gate | 1.0m | 1 | 12.6s | 12.6s | 1.0m | 0ms | insufficient-data |
| Security Smoke Gate | 1.0m | 1 | 8.6s | 8.6s | 1.0m | 0ms | insufficient-data |
| Unit Domain Gate | 10.0m | 0 | n/a | n/a | 10.0m | 0ms | insufficient-data |
| Full Unit Tests | 25.0m | 0 | n/a | n/a | 25.0m | 0ms | insufficient-data |
| E2E Tests | 40.0m | 0 | n/a | n/a | 40.0m | 0ms | insufficient-data |
| Architecture Guardrails | 1.0m | 1 | 2.7s | 2.7s | 1.0m | 0ms | insufficient-data |
| UI Consolidation Guardrail | 1.0m | 2 | 3.1s | 3.2s | 1.0m | 0ms | insufficient-data |
| Observability Check | 30.0s | 2 | 700ms | 717ms | 30.0s | 0ms | insufficient-data |

## Notes

- Recommendations are computed from passing check durations only.
- `--apply-budgets` updates weekly budget constants only when all checks are ready.
- Pending status means there is not enough historical data for at least one check.
