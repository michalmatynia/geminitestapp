---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Bundle Budget Report

Generated at: 2026-04-07T13:17:21.986Z

## Summary

- Status: FAILED
- Page routes discovered: 0
- Configured routes: 8
- Passing routes: 0
- Failing routes: 0
- Shared base JS: 0 B across 0 chunks
- Errors: 3
- Warnings: 0

## Shared Base Budget

| Scope | Status | JS Bytes | Budget | Delta | Chunks | Budget | Delta |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Shared base runtime | FAIL | 0 B | 527.3 KB | -527.3 KB | 0 | 6 | -6 |

## Route Budgets

| Route | Status | Total JS | Budget | Delta | Route JS | Budget | Delta | Chunks | Budget | Delta |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |

## Largest Route Chunks

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| bundle-build-artifact-missing | 3 | 0 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | bundle-build-artifact-missing | .next/app-path-routes-manifest.json | Missing Next build artifact: .next/app-path-routes-manifest.json. Run npm run build before checking bundle budgets. |
| ERROR | bundle-build-artifact-missing | .next/build-manifest.json | Missing Next build artifact: .next/build-manifest.json. Run npm run build before checking bundle budgets. |
| ERROR | bundle-build-artifact-missing | .next/server/app-paths-manifest.json | Missing Next build artifact: .next/server/app-paths-manifest.json. Run npm run build before checking bundle budgets. |

## Notes

- This check reads the current `.next` app-router client reference manifests and measures emitted raw JS bytes, not compressed transfer size.
- Shared base runtime covers `polyfillFiles` plus `rootMainFiles` from `build-manifest.json` and is applied to every configured route.
- Run `npm run build` before using strict mode if the local `.next` output is missing or stale.
