---
owner: 'Platform Team'
last_reviewed: '2026-04-24'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Route Policy Report

Generated at: 2026-04-24T11:48:03.793Z

## Summary

- Status: FAILED
- Routes scanned: 358
- Method exports scanned: 525
- Errors: 7
- Warnings: 8
- CSRF exemptions: 66

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| route-csrf-optout-unreviewed | 6 | 0 | 0 |
| route-export-direct-function | 1 | 0 | 0 |
| route-source-mismatch | 0 | 6 | 0 |
| route-export-none-detected | 0 | 1 | 0 |
| route-parsejson-without-bodyschema | 0 | 1 | 0 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| ERROR | route-export-direct-function | src/app/api/playwright/live-scripter/ws/route.ts:3:17 | Route exports GET as a function. Use apiHandler/apiHandlerWithParams wrapper exports instead. |
| ERROR | route-csrf-optout-unreviewed | src/app/api/playwright/programmable/connections/[id]/cleanup-browser-persistence/route-handler.ts:7:14 | POST disables CSRF without matching a reviewed exemption policy. |
| ERROR | route-csrf-optout-unreviewed | src/app/api/playwright/programmable/connections/[id]/promote-browser-ownership/route-handler.ts:7:14 | POST disables CSRF without matching a reviewed exemption policy. |
| ERROR | route-csrf-optout-unreviewed | src/app/api/playwright/programmable/connections/[id]/route-handler.ts:7:14 | PUT disables CSRF without matching a reviewed exemption policy. |
| ERROR | route-csrf-optout-unreviewed | src/app/api/playwright/programmable/connections/cleanup-browser-persistence/route-handler.ts:7:14 | POST disables CSRF without matching a reviewed exemption policy. |
| ERROR | route-csrf-optout-unreviewed | src/app/api/playwright/programmable/connections/route-handler.ts:12:14 | POST disables CSRF without matching a reviewed exemption policy. |
| ERROR | route-csrf-optout-unreviewed | src/app/api/playwright/programmable/test/route-handler.ts:7:14 | POST disables CSRF without matching a reviewed exemption policy. |
| WARN | route-export-none-detected | src/app/api/playwright/live-scripter/ws/route.ts | Route file did not expose any HTTP method exports. |
| WARN | route-source-mismatch | src/app/api/playwright/programmable/connections/[id]/cleanup-browser-persistence/route-handler.ts:7:14 | Route export POST uses source "playwright.programmable.connections.[id].cleanupBrowserPersistence.POST" but expected "playwright.programmable.connections.[id].cleanup-browser-persistence.POST". |
| WARN | route-source-mismatch | src/app/api/playwright/programmable/connections/[id]/promote-browser-ownership/route-handler.ts:7:14 | Route export POST uses source "playwright.programmable.connections.[id].promoteBrowserOwnership.POST" but expected "playwright.programmable.connections.[id].promote-browser-ownership.POST". |
| WARN | route-source-mismatch | src/app/api/playwright/programmable/connections/cleanup-browser-persistence/route-handler.ts:7:14 | Route export POST uses source "playwright.programmable.connections.cleanupBrowserPersistence.POST" but expected "playwright.programmable.connections.cleanup-browser-persistence.POST". |
| WARN | route-parsejson-without-bodyschema | src/app/api/query-telemetry/route.ts:6:14 | POST parses JSON without a bodySchema guard. |
| WARN | route-source-mismatch | src/app/api/v2/integrations/[id]/connections/cleanup-playwright-browser-persistence/route-handler.ts:8:14 | Route export POST uses source "v2.integrations.[id].connections.cleanupPlaywrightBrowserPersistence.POST" but expected "v2.integrations.[id].connections.cleanup-playwright-browser-persistence.POST". |
| WARN | route-source-mismatch | src/app/api/v2/integrations/connections/[id]/cleanup-playwright-browser-persistence/route-handler.ts:8:14 | Route export POST uses source "v2.integrations.connections.[id].cleanupPlaywrightBrowserPersistence.POST" but expected "v2.integrations.connections.[id].cleanup-playwright-browser-persistence.POST". |
| WARN | route-source-mismatch | src/app/api/v2/integrations/connections/[id]/promote-playwright-browser-ownership/route-handler.ts:8:14 | Route export POST uses source "v2.integrations.connections.[id].promotePlaywrightBrowserOwnership.POST" but expected "v2.integrations.connections.[id].promote-playwright-browser-ownership.POST". |

## CSRF Exemption Inventory

| Route | Method | Policy | Reason |
| --- | --- | --- | --- |
| analytics/events | POST | telemetry-ingest | Telemetry and client error endpoints ingest browser-originated reports. |
| auth/[...nextauth] | POST | auth-bootstrap | Auth bootstrap flows need to accept requests before app CSRF is established. |
| auth/mfa/disable | POST | auth-bootstrap | Auth bootstrap flows need to accept requests before app CSRF is established. |
| auth/mfa/setup | POST | auth-bootstrap | Auth bootstrap flows need to accept requests before app CSRF is established. |
| auth/mfa/verify | POST | auth-bootstrap | Auth bootstrap flows need to accept requests before app CSRF is established. |
| auth/mock-signin | POST | auth-bootstrap | Auth bootstrap flows need to accept requests before app CSRF is established. |
| auth/register | POST | auth-bootstrap | Auth bootstrap flows need to accept requests before app CSRF is established. |
| auth/roles | PATCH | auth-bootstrap | Auth bootstrap flows need to accept requests before app CSRF is established. |
| auth/users/[id] | PATCH | auth-bootstrap | Auth bootstrap flows need to accept requests before app CSRF is established. |
| auth/users/[id] | DELETE | auth-bootstrap | Auth bootstrap flows need to accept requests before app CSRF is established. |
| auth/users/[id]/security | PATCH | auth-bootstrap | Auth bootstrap flows need to accept requests before app CSRF is established. |
| auth/verify-credentials | POST | auth-bootstrap | Auth bootstrap flows need to accept requests before app CSRF is established. |
| client-errors | POST | telemetry-ingest | Telemetry and client error endpoints ingest browser-originated reports. |
| filemaker/campaigns/preferences | POST | public-campaign-links | Public email campaign tracking and preference endpoints must accept tokenized requests from email clients and landing pages. |
| filemaker/campaigns/unsubscribe | POST | public-campaign-links | Public email campaign tracking and preference endpoints must accept tokenized requests from email clients and landing pages. |
| kangur/auth/parent-magic-link/exchange | POST | deprecated-public-auth | Deprecated auth endpoints stay reachable so stale clients receive a controlled 410 response. |
| kangur/auth/parent-magic-link/request | POST | deprecated-public-auth | Deprecated auth endpoints stay reachable so stale clients receive a controlled 410 response. |
| playwright/programmable/connections/[id]/cleanup-browser-persistence | POST | unreviewed | No approved exemption policy matched. |
| playwright/programmable/connections/[id]/promote-browser-ownership | POST | unreviewed | No approved exemption policy matched. |
| playwright/programmable/connections/[id] | PUT | unreviewed | No approved exemption policy matched. |
| playwright/programmable/connections/cleanup-browser-persistence | POST | unreviewed | No approved exemption policy matched. |
| playwright/programmable/connections | POST | unreviewed | No approved exemption policy matched. |
| playwright/programmable/test | POST | unreviewed | No approved exemption policy matched. |
| query-telemetry | POST | telemetry-ingest | Telemetry and client error endpoints ingest browser-originated reports. |
| v2/integrations/[id]/connections/[connectionId]/allegro/disconnect | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/[id]/connections/[connectionId]/allegro/request | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/[id]/connections/[connectionId]/allegro/test | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/[id]/connections/[connectionId]/base/products | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/[id]/connections/[connectionId]/base/request | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/[id]/connections/[connectionId]/base/test | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/[id]/connections/[connectionId]/test | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/[id]/connections/cleanup-playwright-browser-persistence | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/[id]/connections | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/connections/[id]/cleanup-playwright-browser-persistence | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/connections/[id]/promote-playwright-browser-ownership | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/connections/[id] | PUT | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/connections/[id] | DELETE | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/exports/1688/[setting] | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/exports/base/[setting] | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/exports/tradera/[setting] | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/exports/vinted/[setting] | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/images/sync-base/all | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/imports/base/[setting] | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/imports/base/parameters | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/imports/base | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/imports/base/runs/[runId]/cancel | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/imports/base/runs/[runId]/resume | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/imports/base/runs | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/imports/base/sample-product | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/playwright/test | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/product-listings | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/product-listings/tradera-status-check | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/base/link-existing | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/base/sku-check | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/export-to-base | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings/[listingId]/check-status | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings/[listingId]/delete-from-base | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings/[listingId]/move-to-unsold | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings/[listingId]/purge | DELETE | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings/[listingId]/relist | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings/[listingId] | DELETE | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings/[listingId] | PATCH | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings/[listingId]/sync | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings/[listingId]/sync-base-images | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/tradera/link-existing | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |

## Notes

- App API routes should use apiHandler/apiHandlerWithParams consistently.
- Source naming mismatches and dynamic wrapper mismatches are reported as warnings while legacy route conventions remain in place.
- Strict mode fails on route policy errors. Add --fail-on-warnings to promote warnings into a gate.
