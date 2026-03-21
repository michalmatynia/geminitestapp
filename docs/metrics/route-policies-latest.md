---
owner: 'Platform Team'
last_reviewed: '2026-03-21'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Route Policy Report

Generated at: 2026-03-21T16:44:06.476Z

## Summary

- Status: PASSED
- Routes scanned: 294
- Method exports scanned: 438
- Errors: 0
- Warnings: 0
- CSRF exemptions: 47

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |

## Issues

No route policy issues detected.

## CSRF Exemption Inventory

| Route | Method | Policy | Reason |
| --- | --- | --- | --- |
| ai-paths/portable-engine/remediation-webhook | POST | webhook-ingest | Webhook-style endpoints must accept third-party callbacks. |
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
| kangur/auth/parent-magic-link/exchange | POST | deprecated-public-auth | Deprecated auth endpoints stay reachable so stale clients receive a controlled 410 response. |
| kangur/auth/parent-magic-link/request | POST | deprecated-public-auth | Deprecated auth endpoints stay reachable so stale clients receive a controlled 410 response. |
| query-telemetry | POST | telemetry-ingest | Telemetry and client error endpoints ingest browser-originated reports. |
| v2/integrations/[id]/connections/[connectionId]/allegro/disconnect | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/[id]/connections/[connectionId]/allegro/request | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/[id]/connections/[connectionId]/allegro/test | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/[id]/connections/[connectionId]/base/products | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/[id]/connections/[connectionId]/base/request | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/[id]/connections/[connectionId]/base/test | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/[id]/connections/[connectionId]/test | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/[id]/connections | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/connections/[id] | PUT | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/connections/[id] | DELETE | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/exports/base/[setting] | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/images/sync-base/all | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/imports/base/[setting] | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/imports/base/parameters | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/imports/base | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/imports/base/runs/[runId]/cancel | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/imports/base/runs/[runId]/resume | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/imports/base/runs | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/imports/base/sample-product | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/product-listings | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/base/link-existing | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/base/sku-check | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/export-to-base | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings/[listingId]/delete-from-base | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings/[listingId]/purge | DELETE | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings/[listingId]/relist | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings/[listingId] | DELETE | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings/[listingId] | PATCH | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings/[listingId]/sync-base-images | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |
| v2/integrations/products/[id]/listings | POST | external-integrations | Integration routes accept external callbacks, requests, and connection flows. |

## Notes

- App API routes should use apiHandler/apiHandlerWithParams consistently.
- Source naming mismatches and dynamic wrapper mismatches are reported as warnings while legacy route conventions remain in place.
- Strict mode fails on route policy errors. Add --fail-on-warnings to promote warnings into a gate.
