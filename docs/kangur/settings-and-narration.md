# Kangur Settings And Narration

## Settings ownership

Kangur settings are centrally persisted through the shared settings store. They are not route-local preferences.

## Narrator settings

The global narrator settings define:

- narrator engine
- default voice for server narration

Learner lessons consume these values so the narrator behavior stays consistent across the app.

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
