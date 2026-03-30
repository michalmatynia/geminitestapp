---
owner: 'Kangur Team'
last_reviewed: '2026-03-26'
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
- session and activity history
- AI Tutor mood and recommendation context

This route is learner-facing, but it also acts as the fastest place for a parent or admin to validate whether progress data is being recorded correctly.

## Parent dashboard

The parent dashboard is the management surface for:

- switching between learner profiles
- creating learner accounts
- editing learner credentials and status
- reviewing aggregated progress
- reviewing score history
- assigning lessons and practice goals

The stable web parent dashboard runtime lives in `src/features/kangur/ui/pages/ParentDashboard.tsx`.
The mobile app currently contains `/parent` in this branch, but that route is
still branch-local and should not be treated as the stable native contract yet.

## Parent account onboarding

Parent access to Kangur starts on the shared login screen.

The current onboarding flow is:

- the parent chooses `Tworze konto rodzica`
- the parent enters email and password
- Kangur sends a confirmation email with a single-use verification link
- the real auth account is created only after that verification link is consumed
- after verification, the parent can sign in with the same email and password

Important behavior:

- `AI Tutor` remains locked until the parent email is verified
- the login screen exposes `Wyslij email ponownie`, shows the remaining cooldown directly in the confirmation card, and re-enables resend only after that timer expires
- the resend cooldown uses the current `Parent email cooldown` setting from `Kangur Settings`; the UI falls back to the default only when the API does not provide an explicit retry value
- an attempted parent sign-in with an unverified email routes the user back into the confirmation/resend flow
- legacy parent accounts that were created before password login existed are redirected into `Tworze konto rodzica` recovery so the parent can set a password and trigger a fresh verification email

## Tabs

The current parent dashboard exposes four runtime tabs:

- `Postęp`
- `Zadania`
- `Monitorowanie zadań`
- `AI Tutor`

Each tab needs a stable documentation entry because the same shell is reused while the content focus changes.

The current tab ids and documentation anchors are:

- `progress` -> `parent_progress_tab`
- `assign` -> `parent_assignments_tab`
- `monitoring` -> `parent_monitoring_tab`
- `ai-tutor` -> `parent_ai_tutor_tab`

The `AI Tutor` tab is the learner-specific tutoring control surface. It is where the parent enables or disables the tutor and configures guardrails for the selected learner.

Those guardrails currently include:

- whether the tutor appears during lessons
- how the tutor behaves during tests
- whether retrieved sources are shown back to the learner
- whether the learner can ask about highlighted text fragments
- whether the tutor conversation should persist across pages

Global tutor behavior such as the tutor persona, Brain chat routing, tutor motion preset, and daily message cap is managed in `Kangur Settings` and applies across the whole app.

When the tutor is enabled, the same tab also shows the current day's tutor usage for the selected learner, including the consumed message count and the remaining quota when the global daily cap is active.

## Related runtime widgets

The current profile and parent-dashboard experience is composed from dedicated
widgets rather than one monolithic panel:

- learner profile hero, overview, level progress, mastery, performance,
  sessions, assignments, results, recommendations, and AI Tutor mood widgets
- parent dashboard hero, progress, assignments, assignment monitoring, and
  AI Tutor widgets

## Documentation requirement

Profile actions, recommendation links, parent tabs, learner selector cards, and create/save actions should be documented centrally. Tooltip strings must remain derived from those entries.
