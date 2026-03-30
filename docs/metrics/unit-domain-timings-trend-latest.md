---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Unit Domain Timings Trend

Generated at: 2026-03-26T12:51:46.476Z
Window: last 7 day(s)
Runs analyzed: 1

## Run Timeline

| Run | Total Duration | Delta vs Prev | Passed | Failed | Timed out | Skipped |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2026-03-26T12:50:41.057Z | 7.8m | n/a | 4 | 1 | 0 | 0 |

## Domain: auth

Owner: `team-auth-platform`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-26T12:50:41.057Z | PASS | 12.2s | n/a | 0 |

## Domain: products

Owner: `team-products-platform`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-26T12:50:41.057Z | FAIL | 1.8m | n/a | 1 |

## Domain: ai-paths

Owner: `team-ai-runtime`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-26T12:50:41.057Z | PASS | 3.3m | n/a | 0 |

## Domain: image-studio

Owner: `team-image-studio`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-26T12:50:41.057Z | PASS | 59.7s | n/a | 0 |

## Domain: case-resolver

Owner: `team-case-resolver`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-26T12:50:41.057Z | PASS | 1.5m | n/a | 0 |

## Notes

- Tracks runtime drift of deterministic unit domain suites.
- Use this trend to catch regressions before full unit lane latency spikes.
