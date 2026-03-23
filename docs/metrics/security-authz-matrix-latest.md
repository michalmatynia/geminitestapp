---
owner: 'Platform Team'
last_reviewed: '2026-03-23'
status: 'generated'
doc_type: 'generated'
scope: 'generated'
canonical: true
---
# Security Authorization Matrix Report

Generated at: 2026-03-23T09:44:34.044Z

## Summary

- Status: PASSED
- Route files scanned: 285
- Route methods scanned: 215
- Public methods: 15
- Protected methods: 199
- Signed ingress methods: 0
- Actor-scoped methods: 1
- Errors: 0
- Warnings: 0

## Route Classification

| Route | Method | Expected Access | Evidence |
| --- | --- | --- | --- |
| agent/approval-gates | GET | protected | - |
| agent/capabilities | GET | protected | - |
| agent/leases | GET | protected | - |
| agent/leases | POST | protected | - |
| agent/resources | GET | protected | - |
| agentcreator/[[...path]] | GET | protected | - |
| agentcreator/[[...path]] | POST | protected | - |
| agentcreator/[[...path]] | PUT | protected | - |
| agentcreator/[[...path]] | PATCH | protected | - |
| agentcreator/[[...path]] | DELETE | protected | - |
| ai/actions/execute | POST | protected | - |
| ai/actions/propose | POST | protected | - |
| ai/context/bundle | POST | protected | - |
| ai/context/related/[id] | GET | protected | - |
| ai/context/resolve | POST | protected | - |
| ai/context/search | POST | protected | - |
| ai/schema/[entity] | GET | protected | - |
| ai-insights/notifications | GET | protected | - |
| ai-insights/notifications | DELETE | protected | - |
| ai-paths/[[...path]] | GET | protected | - |
| ai-paths/[[...path]] | POST | protected | - |
| ai-paths/[[...path]] | PUT | protected | - |
| ai-paths/[[...path]] | PATCH | protected | - |
| ai-paths/[[...path]] | DELETE | protected | - |
| analytics/events | POST | public | - |
| analytics/events | GET | session | `auth()`, `session.user` |
| analytics/insights | GET | session | - |
| analytics/insights | POST | session | - |
| analytics/summary | GET | session | `auth()`, `session.user` |
| assets3d/[id]/file | GET | protected | - |
| assets3d/[id] | GET | protected | - |
| assets3d/[id] | PATCH | protected | - |
| assets3d/[id] | DELETE | protected | - |
| assets3d/categories | GET | protected | - |
| assets3d/reindex | POST | protected | - |
| assets3d | GET | protected | - |
| assets3d | POST | protected | - |
| assets3d/tags | GET | protected | - |
| auth/[...nextauth] | GET | public | - |
| auth/[...nextauth] | POST | public | - |
| auth/mfa/disable | POST | protected | `auth()`, `session.user` |
| auth/mfa/setup | POST | protected | `auth()`, `session.user` |
| auth/mfa/verify | POST | protected | `auth()`, `session.user` |
| auth/mock-signin | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| auth/register | POST | public | - |
| auth/roles | GET | protected | `auth()` |
| auth/roles | PATCH | protected | `auth()` |
| auth/users/[id] | PATCH | protected | `auth()`, `session.user`, `permission/isElevated` |
| auth/users/[id] | DELETE | protected | `auth()`, `session.user`, `permission/isElevated` |
| auth/users/[id]/security | GET | protected | `auth()`, `session.user`, `permission/isElevated` |
| auth/users/[id]/security | PATCH | protected | `auth()`, `session.user`, `permission/isElevated` |
| auth/users | GET | protected | `auth()`, `session.user`, `permission/isElevated` |
| auth/verify-credentials | POST | public | - |
| brain/models | GET | protected | - |
| brain/operations/overview | GET | protected | - |
| case-resolver/assets/extract-pdf | POST | protected | - |
| case-resolver/assets/upload | POST | protected | - |
| case-resolver/documents/export-pdf | POST | protected | - |
| case-resolver/ocr/jobs/[jobId] | GET | protected | - |
| case-resolver/ocr/jobs/[jobId] | POST | protected | - |
| case-resolver/ocr/jobs | POST | protected | - |
| case-resolver/ocr/models | GET | protected | - |
| case-resolver/ocr/observability | GET | protected | - |
| chatbot/[[...path]] | GET | protected | - |
| chatbot/[[...path]] | POST | protected | - |
| chatbot/[[...path]] | PUT | protected | - |
| chatbot/[[...path]] | PATCH | protected | - |
| chatbot/[[...path]] | DELETE | protected | - |
| client-errors | POST | public | - |
| cms/css-ai/stream | POST | protected | - |
| cms/domains/[id] | DELETE | protected | - |
| cms/domains/[id] | PUT | protected | - |
| cms/domains | GET | protected | - |
| cms/domains | POST | protected | - |
| cms/media | POST | protected | - |
| cms/pages/[id] | GET | protected | - |
| cms/pages/[id] | PUT | protected | - |
| cms/pages/[id] | DELETE | protected | - |
| cms/pages | GET | protected | - |
| cms/pages | POST | protected | - |
| cms/slugs/[id]/domains | GET | protected | - |
| cms/slugs/[id]/domains | PUT | protected | - |
| cms/slugs/[id] | GET | protected | - |
| cms/slugs/[id] | DELETE | protected | - |
| cms/slugs/[id] | PUT | protected | - |
| cms/slugs | GET | protected | - |
| cms/slugs | POST | protected | - |
| cms/themes/[id] | GET | protected | - |
| cms/themes/[id] | PUT | protected | - |
| cms/themes/[id] | DELETE | protected | - |
| cms/themes | GET | protected | - |
| cms/themes | POST | protected | - |
| databases/[[...path]] | GET | protected | `access helper` |
| databases/[[...path]] | POST | protected | `access helper` |
| databases/[[...path]] | PUT | protected | `access helper` |
| databases/[[...path]] | PATCH | protected | `access helper` |
| databases/[[...path]] | DELETE | protected | `access helper` |
| drafts/[id] | GET | protected | - |
| drafts/[id] | PUT | protected | - |
| drafts/[id] | DELETE | protected | - |
| drafts | GET | protected | - |
| drafts | POST | protected | - |
| files/[id] | DELETE | protected | - |
| files/[id] | PATCH | protected | - |
| files/preview | GET | protected | - |
| files | GET | protected | - |
| health | GET | public | - |
| image-studio/[[...path]] | GET | protected | - |
| image-studio/[[...path]] | POST | protected | - |
| image-studio/[[...path]] | PUT | protected | - |
| image-studio/[[...path]] | PATCH | protected | - |
| image-studio/[[...path]] | DELETE | protected | - |
| kangur/[[...path]] | GET | protected | - |
| kangur/[[...path]] | POST | protected | - |
| kangur/[[...path]] | PATCH | protected | - |
| kangur/[[...path]] | DELETE | protected | - |
| kangur/auth/learner-signin | POST | public | - |
| kangur/auth/learner-signout | POST | public | `actor/session resolver` |
| kangur/auth/me | GET | actor | `access helper`, `actor/session resolver` |
| kangur/auth/parent-account/create | POST | protected | `auth()` |
| kangur/auth/parent-account/resend | POST | protected | `auth()` |
| kangur/auth/parent-email/verify | POST | protected | `auth()` |
| kangur/auth/parent-magic-link/exchange | POST | protected | `auth()` |
| kangur/auth/parent-magic-link/request | POST | protected | `auth()` |
| marketplace/[resource] | GET | protected | - |
| marketplace/categories/fetch | POST | protected | - |
| marketplace/mappings/[id] | GET | protected | - |
| marketplace/mappings/[id] | PUT | protected | - |
| marketplace/mappings/[id] | DELETE | protected | - |
| marketplace/mappings/bulk | POST | protected | - |
| marketplace/mappings | GET | protected | - |
| marketplace/mappings | POST | protected | - |
| marketplace/producer-mappings/bulk | POST | protected | - |
| marketplace/producer-mappings | GET | protected | - |
| marketplace/producer-mappings | POST | protected | - |
| marketplace/producers/fetch | POST | protected | - |
| marketplace/tag-mappings/bulk | POST | protected | - |
| marketplace/tag-mappings | GET | protected | - |
| marketplace/tag-mappings | POST | protected | - |
| marketplace/tags/fetch | POST | protected | - |
| notes/[id]/files/[slotIndex] | DELETE | protected | - |
| notes/[id]/files | GET | protected | - |
| notes/[id]/files | POST | protected | - |
| notes/[id] | GET | protected | - |
| notes/[id] | PATCH | protected | - |
| notes/[id] | DELETE | protected | - |
| notes/categories/[id] | PATCH | protected | - |
| notes/categories/[id] | DELETE | protected | - |
| notes/categories | GET | protected | - |
| notes/categories | POST | protected | - |
| notes/categories/tree | GET | protected | - |
| notes/import-folder | POST | protected | - |
| notes/lookup | GET | protected | - |
| notes/notebooks/[id] | PATCH | protected | - |
| notes/notebooks/[id] | DELETE | protected | - |
| notes/notebooks | GET | protected | - |
| notes/notebooks | POST | protected | - |
| notes | GET | protected | - |
| notes | POST | protected | - |
| notes/tags/[id] | PATCH | protected | - |
| notes/tags/[id] | DELETE | protected | - |
| notes/tags | GET | protected | - |
| notes/tags | POST | protected | - |
| notes/themes/[id] | GET | protected | - |
| notes/themes/[id] | PATCH | protected | - |
| notes/themes/[id] | DELETE | protected | - |
| notes/themes | GET | protected | - |
| notes/themes | POST | protected | - |
| prompt-runtime/health | GET | public | - |
| public/products/[id] | GET | public | - |
| public/products/categories | GET | public | - |
| public/products/parameters | GET | public | - |
| query-telemetry | POST | public | - |
| search | POST | protected | - |
| settings/cache | GET | protected | `access helper` |
| settings/database/sync | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| settings/heavy | GET | protected | `access helper` |
| settings/lite | GET | public | - |
| settings/migrate/backfill-keys | POST | protected | `auth()`, `session.user`, `permission/isElevated` |
| settings/providers | GET | protected | `access helper` |
| settings | GET | protected | `access helper` |
| settings | POST | protected | `access helper` |
| system/activity | GET | protected | `access helper` |
| system/diagnostics/mongo-indexes | GET | protected | `access helper` |
| system/diagnostics/mongo-indexes | POST | protected | `access helper` |
| system/logs/insights | GET | protected | `access helper` |
| system/logs/insights | POST | protected | `access helper` |
| system/logs/interpret | POST | protected | `access helper` |
| system/logs/metrics | GET | protected | `access helper` |
| system/logs | GET | protected | `access helper` |
| system/logs | POST | protected | `access helper` |
| system/logs | DELETE | protected | `access helper` |
| system/upload-events | GET | protected | `access helper` |
| user/preferences | GET | session | `auth()`, `session.user` |
| user/preferences | PATCH | session | `auth()`, `session.user` |
| user/preferences | POST | session | `auth()`, `session.user` |
| v2/integrations/[[...path]] | GET | protected | - |
| v2/integrations/[[...path]] | POST | protected | - |
| v2/integrations/[[...path]] | PUT | protected | - |
| v2/integrations/[[...path]] | PATCH | protected | - |
| v2/integrations/[[...path]] | DELETE | protected | - |
| v2/metadata/[type]/[id] | GET | protected | - |
| v2/metadata/[type]/[id] | PUT | protected | - |
| v2/metadata/[type]/[id] | DELETE | protected | - |
| v2/metadata/[type] | GET | protected | - |
| v2/metadata/[type] | POST | protected | - |
| v2/products/[[...path]] | GET | protected | - |
| v2/products/[[...path]] | POST | protected | - |
| v2/products/[[...path]] | PUT | protected | - |
| v2/products/[[...path]] | PATCH | protected | - |
| v2/products/[[...path]] | DELETE | protected | - |
| v2/templates/[type]/[id] | PUT | protected | - |
| v2/templates/[type]/[id] | DELETE | protected | - |
| v2/templates/[type] | GET | protected | - |
| v2/templates/[type] | POST | protected | - |

## Rule Breakdown

| Rule | Errors | Warnings | Info |
| --- | ---: | ---: | ---: |

## Issues

No authorization coverage issues detected.

## Notes

- This check validates that non-public API routes show explicit auth, access-helper, actor, or signature evidence in their handlers.
- Public exemptions are intentionally narrow and method-aware so browser telemetry and health routes do not mask broader auth drift.
- Strict mode fails on authz coverage errors. Use --fail-on-warnings to also gate privileged routes that rely only on basic session auth.
