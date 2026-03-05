# Unit Domain Timings Trend

Generated at: 2026-03-05T04:40:55.316Z
Window: last 7 day(s)
Runs analyzed: 2

## Run Timeline

| Run | Total Duration | Delta vs Prev | Passed | Failed | Timed out | Skipped |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2026-03-05T03:33:16.314Z | 4.5m | n/a | 4 | 1 | 0 | 0 |
| 2026-03-05T03:49:28.650Z | 4.6m | +5.3s | 5 | 0 | 0 | 0 |

## Domain: auth

Owner: `team-auth-platform`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-05T03:33:16.314Z | PASS | 14.8s | n/a | 0 |
| 2026-03-05T03:49:28.650Z | PASS | 15.8s | +965ms | 0 |

## Domain: products

Owner: `team-products-platform`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-05T03:33:16.314Z | FAIL | 1.1m | n/a | 1 |
| 2026-03-05T03:49:28.650Z | PASS | 1.2m | +751ms | 0 |

## Domain: ai-paths

Owner: `team-ai-runtime`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-05T03:33:16.314Z | PASS | 1.2m | n/a | 0 |
| 2026-03-05T03:49:28.650Z | PASS | 1.3m | +7.7s | 0 |

## Domain: image-studio

Owner: `team-image-studio`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-05T03:33:16.314Z | PASS | 43.5s | n/a | 0 |
| 2026-03-05T03:49:28.650Z | PASS | 28.8s | -14.7s | 0 |

## Domain: case-resolver

Owner: `team-case-resolver`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-05T03:33:16.314Z | PASS | 1.2m | n/a | 0 |
| 2026-03-05T03:49:28.650Z | PASS | 1.3m | +10.6s | 0 |

## Notes

- Tracks runtime drift of deterministic unit domain suites.
- Use this trend to catch regressions before full unit lane latency spikes.
