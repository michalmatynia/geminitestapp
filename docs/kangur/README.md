# Kangur

## Purpose

Kangur is the learner-facing math practice application for guided lessons, games, tests, and parent-supported progress tracking. It combines authored lesson content, interactive minigames, practice flows, and test suites in one product shell.

## Core surfaces

- `Game`: the learner home screen and quick-start practice flow.
- `Lessons`: the lesson library, document-mode lesson renderer, and legacy interactive lessons.
- `Tests`: curated Kangur-style test suites and question playback.
- `Learner Profile`: progress, streaks, recommendations, and recent results.
- `Parent Dashboard`: learner management, assignments, score visibility, and progress review.
- `Admin`: lesson authoring, test-suite authoring, narration configuration, and documentation-driven tooltip settings.

## Documentation model

Kangur documentation is centralized under `docs/kangur/*`. Tooltip copy must be derived from the documentation catalog and never authored inline in React components. UI controls reference stable `docId` values, and the shared documentation registry resolves tooltip strings from those entries.

## Operational rules

- Learner-facing tooltip text comes from the central documentation catalog.
- Admin-facing tooltip toggles are persisted in Kangur settings.
- Lesson image references are SVG-only.
- Lesson document content and reusable lesson activities are the canonical authoring path for rich lesson experiences.

## Primary references

- `docs/kangur/learner-navigation.md`
- `docs/kangur/lessons-and-activities.md`
- `docs/kangur/tests-and-exams.md`
- `docs/kangur/profile-and-parent-dashboard.md`
- `docs/kangur/admin-content-authoring.md`
- `docs/kangur/settings-and-narration.md`
- `docs/kangur/svg-and-media-rules.md`
