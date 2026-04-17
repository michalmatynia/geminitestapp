---
owner: 'Kangur Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'feature:kangur'
canonical: true
---

# Kangur

## Purpose

Kangur is the learner-facing math practice application for guided lessons, games, tests, and parent-supported progress tracking. It powers the public StudiQ learning app and combines authored lesson content, interactive minigames, practice flows, and test suites in one product shell.

## Open This Hub When

- you need to know which Kangur surface owns web, mobile, admin, API, or shared-package behavior
- you need the canonical doc for a learner feature area instead of searching across workspace READMEs
- you need to understand which Kangur docs are runtime topology versus feature-specific references
- you are changing cross-platform boundaries between the root app, `apps/mobile`, and the shared `packages/kangur-*`

## Application topology

- The root Next.js app at the repository root is still the canonical web deployment. It owns the public StudiQ shell, localized and default-locale Kangur web routes, CMS embedding, `/admin/kangur`, and `/api/kangur/*`.
- `apps/mobile` is the Expo Router native shell for learner-facing Kangur routes on iOS, Android, and Expo web preview.
- `apps/mobile-web` is reserved for a future Expo or React Native Web target and is not the canonical public web app today.
- Shared cross-platform boundaries live in `packages/kangur-contracts`, `packages/kangur-core`, `packages/kangur-api-client`, and `packages/kangur-platform`.

## Core surfaces

- `Game`: the learner home screen and quick-start practice flow.
- `Games Library`: catalog and launch surface for portable and engine-backed minigames.
- `Lessons`: the lesson library, document-mode lesson renderer, and legacy interactive lessons.
- `Tests`: curated Kangur-style test suites and question playback.
- `Competition`: Kangur exam flow and competition sessions.
- `Duels`: multiplayer practice lobby and active duels.
- `Learner Profile`: progress, streaks, recommendations, and recent results.
- `Parent Dashboard`: learner management, assignments, score visibility, and progress review.
- `AI Tutor`: contextual tutoring, native guide content, and page-content driven assistance.
- `Social Updates`: Kangur/StudiQ product updates feed for sharing improvements.
- `Admin`: lesson authoring, test-suite authoring, narration configuration, and documentation-driven tooltip settings.
  - Operations dashboard: `/admin/kangur/observability`

## Documentation model

Canonical feature documentation stays under `docs/kangur/*`. Local app and package READMEs can document runtime boundaries, commands, and exports, but they must point back to this hub rather than becoming parallel feature specifications. Tooltip copy must be derived from the documentation catalog and never authored inline in React components. UI controls reference stable `docId` values, and the shared documentation registry resolves tooltip strings from those entries. AI Tutor copy is sourced from the page-content catalog and native guide entries, not inline UI strings.

## Operational rules

- Learner-facing tooltip text comes from the central documentation catalog.
- Admin-facing tooltip toggles are persisted in Kangur settings.
- Lesson image references are SVG-only.
- Lesson document content and reusable lesson activities are the canonical authoring path for rich lesson experiences.
- AI Tutor content must come from the page-content catalog and native guide entries.
- Mobile startup is part of the current runtime contract: the native app uses a branded bootstrap screen, persisted learner bootstrap snapshots, and staged home hydration to keep first paint responsive.

## Primary references

- `docs/kangur/studiq-application.md`: current web, mobile, admin, API, and runtime topology.
- `docs/kangur/react-native-monorepo-scaffold.md`: shared package boundaries and cross-platform workspace rules.
- `docs/kangur/learner-navigation.md`
- `docs/kangur/lessons-and-activities.md`
- `docs/kangur/tests-and-exams.md`
- `docs/kangur/profile-and-parent-dashboard.md`
- `docs/kangur/admin-content-authoring.md`
- `docs/kangur/duels-mobile-checklist.md`
- `docs/kangur/settings-and-narration.md`
- `docs/kangur/svg-and-media-rules.md`
- `docs/kangur/number-balance-rush-ui.md`
- `docs/kangur/observability-and-operations.md`
- `docs/kangur/neo4j-semantic-bridge.md`
- `docs/kangur/linkedin-posts-runbook.md`
- `docs/kangur/recent-feature-updates.md`
- `docs/kangur/plans/README.md`
- `apps/mobile/README.md`: native route inventory, provider stack, commands, and caveats.
- `apps/mobile-web/README.md`: reserved workspace status and ownership boundary.
- `packages/kangur-contracts/README.md`
- `packages/kangur-core/README.md`
- `packages/kangur-api-client/README.md`
- `packages/kangur-platform/README.md`

## Which Doc To Use

| Question | Canonical doc |
| --- | --- |
| What owns the current web, mobile, admin, and API topology? | [`studiq-application.md`](./studiq-application.md) |
| How are the cross-platform workspaces and packages split? | [`react-native-monorepo-scaffold.md`](./react-native-monorepo-scaffold.md) |
| How do learner routes and navigation fit together? | [`learner-navigation.md`](./learner-navigation.md) |
| How are lessons and reusable activities authored? | [`lessons-and-activities.md`](./lessons-and-activities.md) |
| How do tests, exams, and competition flows work? | [`tests-and-exams.md`](./tests-and-exams.md) |
| How do profile and parent-facing surfaces work? | [`profile-and-parent-dashboard.md`](./profile-and-parent-dashboard.md) |
| How is admin authoring and configuration documented? | [`admin-content-authoring.md`](./admin-content-authoring.md), [`settings-and-narration.md`](./settings-and-narration.md) |
| What are the current mobile runtime commands and caveats? | [`../../apps/mobile/README.md`](../../apps/mobile/README.md) |
| What is the status of the reserved mobile-web workspace? | [`../../apps/mobile-web/README.md`](../../apps/mobile-web/README.md) |
| Which package owns contracts, domain logic, transport, or platform ports? | [`../../packages/kangur-contracts/README.md`](../../packages/kangur-contracts/README.md), [`../../packages/kangur-core/README.md`](../../packages/kangur-core/README.md), [`../../packages/kangur-api-client/README.md`](../../packages/kangur-api-client/README.md), [`../../packages/kangur-platform/README.md`](../../packages/kangur-platform/README.md) |

## Documentation Shape

- Use this hub for feature-level topology and entrypoint selection.
- Use the app READMEs for runtime commands, local workflows, and app-specific caveats.
- Use the package READMEs for ownership boundaries and export intent.
- Treat [`recent-feature-updates.md`](./recent-feature-updates.md) as change history and product context, not as the canonical runtime specification.
