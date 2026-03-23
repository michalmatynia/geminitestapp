---
owner: 'Platform Team'
last_reviewed: '2026-03-23'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# API Contract Coverage Report

Generated at: 2026-03-23T21:12:57.338Z

## Summary

- Status: PASSED
- Route files scanned: 285
- Route methods scanned: 215
- Methods with adjacent tests: 196
- Mutations with body validation: 37
- Query routes with validation: 10
- Errors: 0
- Warnings: 0
- Info: 9

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |
| api-contract-route-missing-tests | 0 | 0 | 9 |

## Issues

| Severity | Rule | Location | Message |
| --- | --- | --- | --- |
| INFO | api-contract-route-missing-tests | src/app/api/ai/context/related/[id]/route.ts:9:14 | GET ai/context/related/[id] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/ai/schema/[entity]/route.ts:9:14 | GET ai/schema/[entity] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/case-resolver/ocr/observability/route.ts:8:14 | GET case-resolver/ocr/observability has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/files/preview/route.ts:7:14 | GET files/preview has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/files/route.ts:9:14 | GET files has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/marketplace/[resource]/route.ts:29:14 | GET marketplace/[resource] has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/notes/categories/tree/route.ts:7:14 | GET notes/categories/tree has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/settings/cache/route.ts:7:14 | GET settings/cache has no adjacent route/handler test coverage. |
| INFO | api-contract-route-missing-tests | src/app/api/settings/heavy/route.ts:8:14 | GET settings/heavy has no adjacent route/handler test coverage. |

## Route Inventory

| Route | Method | Access | Tests | Body Validation | Query Validation |
| --- | --- | --- | --- | --- | --- |
| agent/approval-gates | GET | protected | yes | - | - |
| agent/capabilities | GET | protected | yes | - | - |
| agent/leases | GET | protected | yes | - | - |
| agent/leases | POST | protected | yes | yes | - |
| agent/resources | GET | protected | yes | - | - |
| agentcreator/[[...path]] | GET | protected | yes | - | - |
| agentcreator/[[...path]] | POST | protected | yes | - | - |
| agentcreator/[[...path]] | PUT | protected | yes | - | - |
| agentcreator/[[...path]] | PATCH | protected | yes | - | - |
| agentcreator/[[...path]] | DELETE | protected | yes | - | - |
| ai/actions/execute | POST | protected | yes | yes | - |
| ai/actions/propose | POST | protected | yes | yes | - |
| ai/context/bundle | POST | protected | yes | yes | - |
| ai/context/related/[id] | GET | protected | no | - | - |
| ai/context/resolve | POST | protected | yes | yes | - |
| ai/context/search | POST | protected | yes | yes | - |
| ai/schema/[entity] | GET | protected | no | - | - |
| ai-insights/notifications | GET | protected | yes | - | yes |
| ai-insights/notifications | DELETE | protected | yes | - | - |
| ai-paths/[[...path]] | GET | protected | yes | - | - |
| ai-paths/[[...path]] | POST | protected | yes | - | - |
| ai-paths/[[...path]] | PUT | protected | yes | - | - |
| ai-paths/[[...path]] | PATCH | protected | yes | - | - |
| ai-paths/[[...path]] | DELETE | protected | yes | - | - |
| analytics/events | POST | public | yes | - | - |
| analytics/events | GET | session | yes | - | - |
| analytics/insights | GET | session | yes | - | yes |
| analytics/insights | POST | session | yes | - | - |
| analytics/summary | GET | session | yes | - | - |
| assets3d/[id]/file | GET | protected | yes | - | - |
| assets3d/[id] | GET | protected | yes | - | - |
| assets3d/[id] | PATCH | protected | yes | yes | - |
| assets3d/[id] | DELETE | protected | yes | - | - |
| assets3d/categories | GET | protected | yes | - | - |
| assets3d/reindex | POST | protected | yes | - | - |
| assets3d | GET | protected | yes | - | - |
| assets3d | POST | protected | yes | - | - |
| assets3d/tags | GET | protected | yes | - | - |
| auth/[...nextauth] | GET | public | no | - | - |
| auth/[...nextauth] | POST | public | no | - | - |
| auth/mfa/disable | POST | protected | yes | yes | - |
| auth/mfa/setup | POST | protected | yes | - | - |
| auth/mfa/verify | POST | protected | yes | yes | - |
| auth/mock-signin | POST | protected | yes | yes | - |
| auth/register | POST | public | no | yes | - |
| auth/roles | GET | protected | yes | - | - |
| auth/roles | PATCH | protected | yes | yes | - |
| auth/users/[id] | PATCH | protected | yes | yes | - |
| auth/users/[id] | DELETE | protected | yes | yes | - |
| auth/users/[id]/security | GET | protected | yes | - | - |
| auth/users/[id]/security | PATCH | protected | yes | yes | - |
| auth/users | GET | protected | yes | - | - |
| auth/verify-credentials | POST | public | no | yes | - |
| brain/models | GET | protected | yes | - | - |
| brain/operations/overview | GET | protected | yes | - | - |
| case-resolver/assets/extract-pdf | POST | protected | yes | yes | - |
| case-resolver/assets/upload | POST | protected | yes | - | - |
| case-resolver/documents/export-pdf | POST | protected | yes | yes | - |
| case-resolver/ocr/jobs/[jobId] | GET | protected | yes | - | - |
| case-resolver/ocr/jobs/[jobId] | POST | protected | yes | yes | - |
| case-resolver/ocr/jobs | POST | protected | yes | yes | - |
| case-resolver/ocr/models | GET | protected | yes | - | - |
| case-resolver/ocr/observability | GET | protected | no | - | - |
| chatbot/[[...path]] | GET | protected | yes | - | - |
| chatbot/[[...path]] | POST | protected | yes | - | - |
| chatbot/[[...path]] | PUT | protected | yes | - | - |
| chatbot/[[...path]] | PATCH | protected | yes | - | - |
| chatbot/[[...path]] | DELETE | protected | yes | - | - |
| client-errors | POST | public | no | yes | - |
| cms/css-ai/stream | POST | protected | yes | yes | - |
| cms/domains/[id] | DELETE | protected | yes | - | - |
| cms/domains/[id] | PUT | protected | yes | - | - |
| cms/domains | GET | protected | yes | - | - |
| cms/domains | POST | protected | yes | - | - |
| cms/media | POST | protected | yes | yes | - |
| cms/pages/[id] | GET | protected | yes | - | - |
| cms/pages/[id] | PUT | protected | yes | - | - |
| cms/pages/[id] | DELETE | protected | yes | - | - |
| cms/pages | GET | protected | yes | - | - |
| cms/pages | POST | protected | yes | - | - |
| cms/slugs/[id]/domains | GET | protected | yes | - | - |
| cms/slugs/[id]/domains | PUT | protected | yes | - | - |
| cms/slugs/[id] | GET | protected | yes | - | - |
| cms/slugs/[id] | DELETE | protected | yes | - | - |
| cms/slugs/[id] | PUT | protected | yes | - | - |
| cms/slugs | GET | protected | yes | - | - |
| cms/slugs | POST | protected | yes | - | - |
| cms/themes/[id] | GET | protected | yes | - | - |
| cms/themes/[id] | PUT | protected | yes | - | - |
| cms/themes/[id] | DELETE | protected | yes | - | - |
| cms/themes | GET | protected | yes | - | - |
| cms/themes | POST | protected | yes | - | - |
| databases/[[...path]] | GET | protected | yes | - | - |
| databases/[[...path]] | POST | protected | yes | - | - |
| databases/[[...path]] | PUT | protected | yes | - | - |
| databases/[[...path]] | PATCH | protected | yes | - | - |
| databases/[[...path]] | DELETE | protected | yes | - | - |
| drafts/[id] | GET | protected | yes | - | - |
| drafts/[id] | PUT | protected | yes | - | - |
| drafts/[id] | DELETE | protected | yes | - | - |
| drafts | GET | protected | yes | - | - |
| drafts | POST | protected | yes | - | - |
| files/[id] | DELETE | protected | yes | - | - |
| files/[id] | PATCH | protected | yes | - | - |
| files/preview | GET | protected | no | - | - |
| files | GET | protected | no | - | - |
| health | GET | public | no | - | - |
| image-studio/[[...path]] | GET | protected | yes | - | - |
| image-studio/[[...path]] | POST | protected | yes | - | - |
| image-studio/[[...path]] | PUT | protected | yes | - | - |
| image-studio/[[...path]] | PATCH | protected | yes | - | - |
| image-studio/[[...path]] | DELETE | protected | yes | - | - |
| kangur/[[...path]] | GET | protected | yes | - | - |
| kangur/[[...path]] | POST | protected | yes | - | - |
| kangur/[[...path]] | PATCH | protected | yes | - | - |
| kangur/[[...path]] | DELETE | protected | yes | - | - |
| kangur/auth/learner-signin | POST | public | yes | yes | - |
| kangur/auth/learner-signout | POST | public | yes | - | - |
| kangur/auth/me | GET | actor | yes | - | - |
| kangur/auth/parent-account/create | POST | protected | yes | yes | - |
| kangur/auth/parent-account/resend | POST | protected | yes | yes | - |
| kangur/auth/parent-email/verify | POST | protected | yes | yes | - |
| kangur/auth/parent-magic-link/exchange | POST | protected | yes | - | - |
| kangur/auth/parent-magic-link/request | POST | protected | yes | - | - |
| marketplace/[resource] | GET | protected | no | - | - |
| marketplace/categories/fetch | POST | protected | yes | yes | - |
| marketplace/mappings/[id] | GET | protected | yes | - | - |
| marketplace/mappings/[id] | PUT | protected | yes | yes | - |
| marketplace/mappings/[id] | DELETE | protected | yes | - | - |
| marketplace/mappings/bulk | POST | protected | yes | - | - |
| marketplace/mappings | GET | protected | yes | - | yes |
| marketplace/mappings | POST | protected | yes | - | - |
| marketplace/producer-mappings/bulk | POST | protected | yes | - | - |
| marketplace/producer-mappings | GET | protected | yes | - | yes |
| marketplace/producer-mappings | POST | protected | yes | - | - |
| marketplace/producers/fetch | POST | protected | yes | yes | - |
| marketplace/tag-mappings/bulk | POST | protected | yes | - | - |
| marketplace/tag-mappings | GET | protected | yes | - | yes |
| marketplace/tag-mappings | POST | protected | yes | - | - |
| marketplace/tags/fetch | POST | protected | yes | yes | - |
| notes/[id]/files/[slotIndex] | DELETE | protected | yes | - | - |
| notes/[id]/files | GET | protected | yes | - | - |
| notes/[id]/files | POST | protected | yes | - | - |
| notes/[id] | GET | protected | yes | - | - |
| notes/[id] | PATCH | protected | yes | yes | - |
| notes/[id] | DELETE | protected | yes | - | - |
| notes/categories/[id] | PATCH | protected | yes | - | - |
| notes/categories/[id] | DELETE | protected | yes | - | - |
| notes/categories | GET | protected | yes | - | - |
| notes/categories | POST | protected | yes | - | - |
| notes/categories/tree | GET | protected | no | - | - |
| notes/import-folder | POST | protected | yes | - | - |
| notes/lookup | GET | protected | yes | - | - |
| notes/notebooks/[id] | PATCH | protected | yes | - | - |
| notes/notebooks/[id] | DELETE | protected | yes | - | - |
| notes/notebooks | GET | protected | yes | - | - |
| notes/notebooks | POST | protected | yes | - | - |
| notes | GET | protected | yes | - | - |
| notes | POST | protected | yes | - | - |
| notes/tags/[id] | PATCH | protected | yes | - | - |
| notes/tags/[id] | DELETE | protected | yes | - | - |
| notes/tags | GET | protected | yes | - | - |
| notes/tags | POST | protected | yes | - | - |
| notes/themes/[id] | GET | protected | yes | - | - |
| notes/themes/[id] | PATCH | protected | yes | - | - |
| notes/themes/[id] | DELETE | protected | yes | - | - |
| notes/themes | GET | protected | yes | - | - |
| notes/themes | POST | protected | yes | - | - |
| prompt-runtime/health | GET | public | no | - | - |
| public/products/[id] | GET | public | no | - | - |
| public/products/categories | GET | public | no | - | yes |
| public/products/parameters | GET | public | no | - | yes |
| query-telemetry | POST | public | yes | yes | - |
| search | POST | protected | yes | yes | - |
| settings/cache | GET | protected | no | - | - |
| settings/database/sync | POST | protected | yes | - | - |
| settings/heavy | GET | protected | no | - | - |
| settings/lite | GET | public | yes | - | - |
| settings/migrate/backfill-keys | POST | protected | yes | - | - |
| settings/providers | GET | protected | yes | - | - |
| settings | GET | protected | yes | - | - |
| settings | POST | protected | yes | - | - |
| system/activity | GET | protected | yes | - | - |
| system/diagnostics/mongo-indexes | GET | protected | yes | - | - |
| system/diagnostics/mongo-indexes | POST | protected | yes | - | - |
| system/logs/insights | GET | protected | yes | - | yes |
| system/logs/insights | POST | protected | yes | - | - |
| system/logs/interpret | POST | protected | yes | - | - |
| system/logs/metrics | GET | protected | yes | - | yes |
| system/logs | GET | protected | yes | - | yes |
| system/logs | POST | protected | yes | - | - |
| system/logs | DELETE | protected | yes | - | - |
| system/upload-events | GET | protected | yes | - | - |
| user/preferences | GET | session | yes | - | - |
| user/preferences | PATCH | session | yes | yes | - |
| user/preferences | POST | session | yes | yes | - |
| v2/integrations/[[...path]] | GET | protected | yes | - | - |
| v2/integrations/[[...path]] | POST | protected | yes | - | - |
| v2/integrations/[[...path]] | PUT | protected | yes | - | - |
| v2/integrations/[[...path]] | PATCH | protected | yes | - | - |
| v2/integrations/[[...path]] | DELETE | protected | yes | - | - |
| v2/metadata/[type]/[id] | GET | protected | yes | - | - |
| v2/metadata/[type]/[id] | PUT | protected | yes | - | - |
| v2/metadata/[type]/[id] | DELETE | protected | yes | - | - |
| v2/metadata/[type] | GET | protected | yes | - | - |
| v2/metadata/[type] | POST | protected | yes | yes | - |
| v2/products/[[...path]] | GET | protected | yes | - | - |
| v2/products/[[...path]] | POST | protected | yes | - | - |
| v2/products/[[...path]] | PUT | protected | yes | - | - |
| v2/products/[[...path]] | PATCH | protected | yes | - | - |
| v2/products/[[...path]] | DELETE | protected | yes | - | - |
| v2/templates/[type]/[id] | PUT | protected | yes | - | - |
| v2/templates/[type]/[id] | DELETE | protected | yes | - | - |
| v2/templates/[type] | GET | protected | yes | - | - |
| v2/templates/[type] | POST | protected | yes | - | - |

## Notes

- This check looks for explicit request validation and nearby handler/route tests for each API method.
- Strict mode fails on missing body validation errors. Add --fail-on-warnings to also gate missing tests and query validation warnings.
