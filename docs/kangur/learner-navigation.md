---
owner: 'Kangur Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'reference'
scope: 'feature:kangur'
canonical: true
---

# Kangur Learner Navigation

## Primary route set

The current learner-facing Kangur route set is broader than the original core shell.
The stable web page keys are:

- `Game`: learner home and practice hub.
- `GamesLibrary`: catalog of portable and launchable games.
- `Lessons`: lesson library and active lesson playback.
- `Tests`: live custom test suites.
- `Competition`: Kangur exam session flow.
- `Duels`: multiplayer duel lobby and active sessions.
- `LearnerProfile`: learner progress, recommendations, and recent results.
- `ParentDashboard`: learner-management surface for authorized parent-capable accounts.
- `SocialUpdates`: public-facing product updates feed.

Canonical slugs are defined in `src/features/kangur/config/routing.ts`. Web routing supports:

- `/kangur/<slug>`
- localized routes under `src/app/[locale]/(frontend)/kangur/*`
- default-locale bare learner slugs such as `/game`, `/lessons`, and `/tests`

The native app maps a learner subset under `apps/mobile/app/*`, with `/parent`
present in the current branch but still treated as branch-local rather than a
stable mobile contract.

## Top navigation

The web shell exposes a reusable primary navigation model through
`KangurPrimaryNavigation` and `KangurTopNavigationController`.

The stable top-level learner navigation includes:

- home / game hub
- lessons
- tests
- competition
- duels
- profile
- parent dashboard when `canManageLearners` is true
- social updates and games-library entry points when the current shell renders them

The navigation layer also owns:

- the locale switcher
- mobile menu behavior
- guest player name entry
- login / logout actions
- route-transition handoff before internal navigation completes

These controls are intentionally repeated across learner routes so learners and
parents can reorient without relying on browser navigation.

## Home screen

The `Game` route acts as the Kangur home screen. It currently supports:

- guest play with a local player name
- authenticated play with assignment-aware prioritization
- quick access to lessons
- access to Kangur exam mode
- separate navigation to custom tests, duels, learner profile, and Kangur competition sessions
- entry into launchable training flows such as calendar and geometry training
- games-library and social-update entry points through the wider shell

## Documentation and tooltips

Top navigation and learner action controls must be documented with stable `docId`
values. Tooltip text is documentation-backed and can be enabled or disabled
centrally through Kangur help settings and the dedicated documentation admin page.

## Mobile navigation note

The native app in `apps/mobile` uses a different render tree from the web shell,
but it follows the same product route model. Its startup path is intentionally
staged: branded bootstrap first, then quick-access and lower-home sections in
deferred waves so first paint stays responsive.

## Expected admin outcome

When an admin changes tooltip settings for a learner surface, learner-facing
controls should either show documentation-driven tooltip content or no docs
tooltip at all. No hardcoded tooltip copy should remain in the component tree.
