---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'reference'
scope: 'cross-feature'
canonical: true
---

# Wave 1 Apply Summary (2026-03-04)

## Scope

Write-mode (`--write`) verification summary for Wave 1 canonical data migrations.

## Source Artifacts

1. `docs/migrations/reports/wave1-write-local-2026-03-04.json`
2. `docs/migrations/reports/wave1-write-staging-2026-03-04.json`
3. `docs/migrations/reports/wave1-write-prod-2026-03-04.json`

## Environment Summary

| Environment | Generated At (UTC) | Total | Success | Failed | Timed Out | Aggregate `updateCount` |
| --- | --- | --- | --- | --- | --- | --- |
| `local` | `2026-03-04T20:13:29.178Z` | `10` | `10` | `0` | `0` | `0` |
| `staging` | `2026-03-04T20:13:57.944Z` | `10` | `10` | `0` | `0` | `0` |
| `prod` | `2026-03-04T20:14:28.276Z` | `10` | `10` | `0` | `0` | `0` |

## Current Read

1. Apply-mode execution succeeded for all Wave 1 commands in `local`, `staging`, and `prod`.
2. No data mutations were required (`aggregate updateCount=0` in each environment).
