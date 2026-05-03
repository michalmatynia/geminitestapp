---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Lint Domain Checks Trend

Generated at: 2026-03-26T12:51:46.475Z
Window: last 7 day(s)
Runs analyzed: 1

## Run Timeline

| Run | Total Duration | Delta vs Prev | Passed | Failed | Timed out | Skipped |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2026-03-26T12:40:05.891Z | 1.7m | n/a | 0 | 5 | 0 | 0 |

## Domain: auth

Owner: `team-auth-platform`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-26T12:40:05.891Z | FAIL | 958ms | n/a | 2 |

## Domain: products

Owner: `team-products-platform`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-26T12:40:05.891Z | FAIL | 991ms | n/a | 2 |

## Domain: ai-paths

Owner: `team-ai-runtime`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-26T12:40:05.891Z | FAIL | 34.6s | n/a | - |

## Domain: image-studio

Owner: `team-image-studio`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-26T12:40:05.891Z | FAIL | 34.9s | n/a | - |

## Domain: case-resolver

Owner: `team-case-resolver`

| Run | Status | Duration | Delta vs Prev | Exit |
| --- | --- | ---: | ---: | ---: |
| 2026-03-26T12:40:05.891Z | FAIL | 29.2s | n/a | - |

## Notes

- Tracks lint gate stability by domain instead of one long global lint run.
- Use this trend to identify domain-specific lint regressions quickly.
