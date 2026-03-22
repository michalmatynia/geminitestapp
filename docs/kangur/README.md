---
owner: 'Kangur Team'
last_reviewed: '2026-03-22'
status: 'active'
doc_type: 'index'
scope: 'feature:kangur'
canonical: true
---

# Kangur

## Purpose

Kangur is the learner-facing math practice application for guided lessons, games, tests, and parent-supported progress tracking. It powers the public StudiQ learning app and combines authored lesson content, interactive minigames, practice flows, and test suites in one product shell.

## Application topology

- The root Next.js app at the repository root is still the canonical web deployment. It owns the public StudiQ shell, CMS embedding, `/admin/kangur`, and `/api/kangur/*`.
- `apps/mobile` is the Expo Router native shell for learner-facing Kangur routes on iOS, Android, and Expo web preview.
- `apps/mobile-web` is reserved for a future Expo or React Native Web target and is not the canonical public web app today.
- Shared cross-platform boundaries live in `packages/kangur-contracts`, `packages/kangur-core`, `packages/kangur-api-client`, and `packages/kangur-platform`.

## Core surfaces

- `Game`: the learner home screen and quick-start practice flow.
- `Lessons`: the lesson library, document-mode lesson renderer, and legacy interactive lessons.
- `Tests`: curated Kangur-style test suites and question playback.
- `Competition`: Kangur exam flow and competition sessions.
- `Duels`: multiplayer practice lobby and active duels.
- `Learner Profile`: progress, streaks, recommendations, and recent results.
- `Parent Dashboard`: learner management, assignments, score visibility, and progress review.
- `Social Updates`: Kangur/StudiQ product updates feed for sharing improvements.
- `Admin`: lesson authoring, test-suite authoring, narration configuration, and documentation-driven tooltip settings.
  - Operations dashboard: `/admin/kangur/observability`

## Documentation model

Canonical feature documentation stays under `docs/kangur/*`. Local app READMEs can document app-specific runtime and commands, but they must point back to this hub rather than becoming parallel feature specifications. Tooltip copy must be derived from the documentation catalog and never authored inline in React components. UI controls reference stable `docId` values, and the shared documentation registry resolves tooltip strings from those entries. AI Tutor copy is sourced from the page-content catalog and native guide entries, not inline UI strings.

## Operational rules

- Learner-facing tooltip text comes from the central documentation catalog.
- Admin-facing tooltip toggles are persisted in Kangur settings.
- Lesson image references are SVG-only.
- Lesson document content and reusable lesson activities are the canonical authoring path for rich lesson experiences.
- AI Tutor content must come from the page-content catalog and native guide entries.

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
