---
owner: 'Kangur Team'
last_reviewed: '2026-03-16'
status: 'active'
doc_type: 'reference'
scope: 'feature:kangur'
canonical: true
---

# Kangur Learner Navigation

## Top navigation

The Kangur shell exposes a small persistent navigation model:

- `Strona glowna`: returns to the game and practice hub.
- `Lekcje`: opens the lesson library.
- `Testy`: opens custom test suites created with the test engine.
- `Kangur`: opens the Kangur competition exam flow.
- `Pojedynki`: opens the duels lobby.
- `Profil`: opens learner status and account actions.
- `Rodzic`: opens the parent dashboard when the active account can manage learners.

These controls are intentionally repeated across learner routes so learners and parents can reorient without relying on browser navigation.

## Home screen

The `Game` route acts as the Kangur home screen. It supports:

- guest play with a local player name
- authenticated play with assignment-aware prioritization
- quick access to lessons
- access to Kangur exam mode
- separate navigation to custom tests and Kangur competition sessions
- entry into additional practice flows such as calendar and geometry training

## Documentation and tooltips

Top navigation controls must be documented with stable `docId` values. Tooltip text is documentation-backed and can be enabled or disabled centrally in Kangur settings.

## Expected admin outcome

When an admin changes the tooltip setting for the home surface, learner-facing home controls should either show documentation-driven `title` attributes or no docs tooltip at all. No hardcoded tooltip copy should remain in the component tree.
