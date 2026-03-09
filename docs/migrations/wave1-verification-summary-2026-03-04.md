---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'reference'
scope: 'cross-feature'
canonical: true
---

# Wave 1 Verification Summary (2026-03-04)

## Scope

Dry-run verification summary for Wave 1 canonical data migrations across completed environments.

## Source Artifacts

1. `docs/migrations/reports/wave1-dry-run-local.json`
2. `docs/migrations/reports/wave1-dry-run-staging-2026-03-04.json`
3. `docs/migrations/reports/wave1-dry-run-prod-2026-03-04.json`

## Environment Summary

| Environment | Generated At (UTC) | Total | Success | Failed | Timed Out | Aggregate `updateCount` |
| --- | --- | --- | --- | --- | --- | --- |
| `local` | `2026-03-04T20:15:11.837Z` | `10` | `10` | `0` | `0` | `0` |
| `staging` | `2026-03-04T20:05:39.516Z` | `10` | `10` | `0` | `0` | `0` |
| `prod` | `2026-03-04T20:08:59.729Z` | `10` | `10` | `0` | `0` | `0` |

## Command Snapshot

| Command ID | Local Status | Local Duration (ms) | Staging Status | Staging Duration (ms) | Prod Status | Prod Duration (ms) |
| --- | --- | --- | --- | --- | --- | --- |
| `products-normalize-v2` | `success` | `1835` | `success` | `2019` | `success` | `2668` |
| `ai-paths-config-contract-v2` | `success` | `1969` | `success` | `1956` | `success` | `2964` |
| `base-import-parameter-link-map-v2` | `success` | `1421` | `success` | `1389` | `success` | `1548` |
| `base-export-warehouse-preferences-v2` | `success` | `1369` | `success` | `1411` | `success` | `1614` |
| `base-connection-token-storage-v2` | `success` | `1451` | `success` | `1522` | `success` | `1831` |
| `base-token-encryption-v2` | `success` | `1527` | `success` | `1558` | `success` | `1630` |
| `tradera-api-credential-storage-v2` | `success` | `1420` | `success` | `1908` | `success` | `1501` |
| `tradera-api-user-id-storage-v2` | `success` | `4207` | `success` | `2186` | `success` | `1520` |
| `case-resolver-workspace-detached-contract-v2` | `success` | `1614` | `success` | `2126` | `success` | `1676` |
| `cms-page-builder-template-settings-v2` | `success` | `1471` | `success` | `1533` | `success` | `1548` |

## Current Read

1. No dry-run updates were required in `local`, `staging`, or `prod` (`aggregate updateCount=0`).
2. No migration command failures or timeout conditions remain in the latest run set.

## Related Apply Summary

1. `docs/migrations/wave1-apply-summary-2026-03-04.md`
