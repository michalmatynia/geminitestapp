---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: false
---
# Lint Domain Checks Trend

Generated at: 2026-03-05T04:17:48.061Z
Window: last 7 day(s)
Runs analyzed: 2

## Run Timeline

| Run | Total Duration | Delta vs Prev | Passed | Failed | Timed out | Skipped |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2026-03-05T04:00:57.270Z | 5.1s | n/a | 0 | 5 | 0 | 0 |
| 2026-03-05T04:06:33.027Z | 1.7m | +1.6m | 5 | 0 | 0 | 0 |

## Domain: auth

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-05T04:00:57.270Z | FAIL | 1.7s | n/a | 2 |
| 2026-03-05T04:06:33.027Z | PASS | 11.1s | +9.4s | 0 |

## Domain: products

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-05T04:00:57.270Z | FAIL | 821ms | n/a | 2 |
| 2026-03-05T04:06:33.027Z | PASS | 22.6s | +21.7s | 0 |

## Domain: ai-paths

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-05T04:00:57.270Z | FAIL | 841ms | n/a | 2 |
| 2026-03-05T04:06:33.027Z | PASS | 23.7s | +22.8s | 0 |

## Domain: image-studio

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-05T04:00:57.270Z | FAIL | 847ms | n/a | 2 |
| 2026-03-05T04:06:33.027Z | PASS | 21.6s | +20.8s | 0 |

## Domain: case-resolver

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-05T04:00:57.270Z | FAIL | 873ms | n/a | 2 |
| 2026-03-05T04:06:33.027Z | PASS | 20.3s | +19.5s | 0 |

## Notes

- Tracks lint gate stability by domain instead of one long global lint run.
- Use this trend to identify domain-specific lint regressions quickly.
