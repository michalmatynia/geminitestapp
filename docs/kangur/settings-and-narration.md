# Kangur Settings And Narration

## Settings ownership

Kangur settings are centrally persisted through the shared settings store. They are not route-local preferences.

## Narrator settings

The global narrator settings define:

- narrator engine
- default voice for server narration

Learner lessons consume these values so the narrator behavior stays consistent across the app.

## AI Tutor settings

The global AI Tutor settings define:

- tutor persona
- Brain model routing for tutor chat
- shared tutor motion preset for the tutor avatar and bubble
- daily message cap

Parent-facing AI Tutor screens do not edit these values per learner. They only manage learner access and guardrails.
Learner Agents remain part of the separate Agent Teaching feature and are not used by Kangur AI Tutor.

## Documentation-driven tooltips

Kangur exposes a dedicated documentation-driven tooltip configuration. The admin can enable or disable tooltip coverage globally and by surface. Suggested surfaces:

- home
- lessons
- tests
- learner profile
- parent dashboard
- admin

## Source-of-truth rule

Tooltip text must come from the Kangur documentation catalog. UI code should only reference stable `docId` values and runtime enablement flags.

## Save semantics

Settings changes should persist through the central settings API, and learner/admin routes should read the latest stored values rather than maintaining their own tooltip text or state snapshots.
