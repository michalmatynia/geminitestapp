---
owner: 'Kangur Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'reference'
scope: 'feature:kangur'
canonical: true
---

# Kangur Profile And Parent Dashboard

## Learner profile

The learner profile combines:

- XP and level summary
- streak and daily-plan information
- lesson mastery insights
- assignment recommendations
- recent score history

This route is learner-facing, but it also acts as the fastest place for a parent or admin to validate whether progress data is being recorded correctly.

## Parent dashboard

The parent dashboard is the management surface for:

- switching between learner profiles
- creating learner accounts
- editing learner credentials and status
- reviewing aggregated progress
- reviewing score history
- assigning lessons and practice goals

## Tabs

The parent dashboard exposes separate tabs for:

- `Postęp`
- `Wyniki gier`
- `Zadania`
- `AI Tutor`

Each tab needs a stable documentation entry because the same shell is reused while the content focus changes.

The `AI Tutor` tab is the learner-specific tutoring control surface. It is where the parent enables or disables the tutor and configures guardrails for the selected learner.

Those guardrails currently include:

- whether the tutor appears during lessons
- how the tutor behaves during tests
- whether retrieved sources are shown back to the learner
- whether the learner can ask about highlighted text fragments
- whether the tutor conversation should persist across pages

Global tutor behavior such as the tutor persona, Brain chat routing, tutor motion preset, and daily message cap is managed in `Kangur Settings` and applies across the whole app.

When the tutor is enabled, the same tab also shows the current day's tutor usage for the selected learner, including the consumed message count and the remaining quota when the global daily cap is active.

## Documentation requirement

Profile actions, recommendation links, parent tabs, learner selector cards, and create/save actions should be documented centrally. Tooltip strings must remain derived from those entries.
