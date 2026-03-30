---
owner: 'Kangur Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'reference'
scope: 'feature:kangur'
canonical: true
---

# Kangur Settings And Narration

## Settings ownership

Kangur settings are centrally persisted through the shared settings store. They
are not route-local preferences.

The main admin entrypoint is `AdminKangurSettingsPage`, and the dedicated
documentation controls live on `AdminKangurDocumentationPage`.

Current settings ownership spans:

- storefront launch route
- narrator engine and voice
- AI Tutor global behavior
- page-content and native-guide content settings
- parent verification and resend-cooldown behavior
- documentation-driven tooltip settings

## Narrator settings

The global narrator settings define:

- narrator engine
- default voice for server narration
- probe and readiness status for the server narrator path

Learner lessons consume these values so the narrator behavior stays consistent across the app.

## AI Tutor settings

The global AI Tutor settings define:

- tutor persona
- Brain model routing for tutor chat
- shared tutor motion preset for the tutor avatar and bubble
- daily message cap

Parent-facing AI Tutor screens do not edit these values per learner. They only manage learner access and guardrails.
Learner Agents remain part of the separate Agent Teaching feature and are not used by Kangur AI Tutor.

The current settings surface also owns:

- guest intro mode
- home onboarding mode
- page-content settings
- native-guide settings

## Documentation-driven tooltips

Kangur exposes a dedicated documentation-driven tooltip configuration. The admin
can enable or disable tooltip coverage globally and by surface from the
dedicated documentation page. Current surface coverage includes:

- home
- lessons
- tests
- learner profile
- parent dashboard
- admin

## Source-of-truth rule

Tooltip text must come from the Kangur documentation catalog. UI code should only reference stable `docId` values and runtime enablement flags.

## Save semantics

Settings changes should persist through the central settings API, and learner or
admin routes should read the latest stored values rather than maintaining their
own tooltip text or state snapshots.

## Launch-route setting

Kangur now exposes a launch-route setting with two stable targets:

- `web_mobile_view`: responsive browser route
- `dedicated_app`: native app handoff prompt from supported learner routes, with the web shell kept as fallback

That setting is part of the current public product contract and should be
documented whenever launch behavior changes.
