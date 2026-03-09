---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Lint Domain Checks Trend

Generated at: 2026-03-05T04:40:55.404Z
Window: last 7 day(s)
Runs analyzed: 4

## Run Timeline

| Run | Total Duration | Delta vs Prev | Passed | Failed | Timed out | Skipped |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2026-03-05T04:00:57.270Z | 5.1s | n/a | 0 | 5 | 0 | 0 |
| 2026-03-05T04:06:33.027Z | 1.7m | +1.6m | 5 | 0 | 0 | 0 |
| 2026-03-05T04:33:16.757Z | 1.2m | -26.5s | 5 | 0 | 0 | 0 |
| 2026-03-05T04:36:38.577Z | 1.7m | +31.5s | 5 | 0 | 0 | 0 |

## Domain: auth

Owner: `team-auth-platform`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-05T04:00:57.270Z | FAIL | 1.7s | n/a | 2 |
| 2026-03-05T04:06:33.027Z | PASS | 11.1s | +9.4s | 0 |
| 2026-03-05T04:33:16.757Z | PASS | 10.1s | -980ms | 0 |
| 2026-03-05T04:36:38.577Z | PASS | 10.0s | -151ms | 0 |

## Domain: products

Owner: `team-products-platform`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-05T04:00:57.270Z | FAIL | 821ms | n/a | 2 |
| 2026-03-05T04:06:33.027Z | PASS | 22.6s | +21.7s | 0 |
| 2026-03-05T04:33:16.757Z | PASS | 14.6s | -8.0s | 0 |
| 2026-03-05T04:36:38.577Z | PASS | 16.3s | +1.7s | 0 |

## Domain: ai-paths

Owner: `team-ai-runtime`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-05T04:00:57.270Z | FAIL | 841ms | n/a | 2 |
| 2026-03-05T04:06:33.027Z | PASS | 23.7s | +22.8s | 0 |
| 2026-03-05T04:33:16.757Z | PASS | 18.0s | -5.7s | 0 |
| 2026-03-05T04:36:38.577Z | PASS | 25.1s | +7.2s | 0 |

## Domain: image-studio

Owner: `team-image-studio`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-05T04:00:57.270Z | FAIL | 847ms | n/a | 2 |
| 2026-03-05T04:06:33.027Z | PASS | 21.6s | +20.8s | 0 |
| 2026-03-05T04:33:16.757Z | PASS | 17.2s | -4.4s | 0 |
| 2026-03-05T04:36:38.577Z | PASS | 34.0s | +16.8s | 0 |

## Domain: case-resolver

Owner: `team-case-resolver`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-05T04:00:57.270Z | FAIL | 873ms | n/a | 2 |
| 2026-03-05T04:06:33.027Z | PASS | 20.3s | +19.5s | 0 |
| 2026-03-05T04:33:16.757Z | PASS | 12.9s | -7.4s | 0 |
| 2026-03-05T04:36:38.577Z | PASS | 18.9s | +5.9s | 0 |

## Notes

- Tracks lint gate stability by domain instead of one long global lint run.
- Use this trend to identify domain-specific lint regressions quickly.
