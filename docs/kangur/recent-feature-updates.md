---
owner: 'Kangur Team'
last_reviewed: '2026-04-11'
status: 'active'
doc_type: 'overview'
scope: 'feature:kangur'
canonical: true
---

# Kangur Recent Feature Updates (Last Two Weeks)

## Purpose

This document is the canonical source of truth for the most recent Kangur and
StudiQ feature work. It should be used as the primary source for LinkedIn post
creation, release summaries, and AI agent prompts.

## Window

This summary covers changes merged between 2026-03-29 and 2026-04-11 (inclusive).
Update this section whenever the reporting window changes.

## Refresh cadence

Run the refresh script weekly or before publishing release notes:

```bash
npm run docs:kangur:recent-features:refresh
```

Then review and update the narrative sections below using the auto inventory
output as input.

## Selected narrative highlights from the current window

The narrative sections below are curated highlights, not an exhaustive changelog.
The authoritative activity inventory for the window lives in the auto-generated
section at the end of this document.

## Highlight: multilingual navigation polish (2026-03-19)

Kangur navigation now has a real language dropdown, cleaner locale switching,
and more stable cross-locale transitions across desktop and mobile shells.

Highlights:

- The language switcher moved from a cycle button to a compact dropdown with all
  enabled locales.
- Dropdown styling now derives from the active Kangur theme, so hover/selected
  states stay readable in daily and nightly appearances.
- Mobile navigation places the language selector beside the theme selector at
  the top of the menu.
- Locale changes now hand off to the route skeleton immediately, including
  nav-level micro skeletons, to avoid visible rerender flashes during language
  switches.
- Navigation labels and related accessibility copy now resolve through
  `next-intl` instead of hardcoded Polish strings.

Key paths:

- Language switcher: `src/features/kangur/ui/components/KangurLanguageSwitcher.tsx`
- Primary nav shell: `src/features/kangur/ui/components/KangurPrimaryNavigation.tsx`
- Route transition state: `src/features/kangur/ui/context/KangurRouteTransitionContext.tsx`
- Transition overlay: `src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx`

## Localized SVG section wordmarks across the app (2026-03-19)

Top-level Kangur section headings now use locale-aware SVG wordmarks instead of
mixed hardcoded Polish art or plain text fallbacks.

Highlights:

- Lessons, `Let's play`, Kangur setup, and Training headings now render
  translated SVG labels with the same font sizing and visual contract as the
  original Polish wordmarks.
- Tests, Parent Dashboard, and the Duels lobby now also use dedicated SVG
  section labels, keeping the same curved-wordmark style across more app
  surfaces.
- German and English labels no longer fall back to English or Polish art when a
  translated locale label is available.
- The shared text-wordmark base keeps non-Polish section headings visually
  consistent without stretching translated labels.

Key paths:

- Shared SVG text base: `src/features/kangur/ui/components/KangurTextWordmark.tsx`
- Lessons wordmark: `src/features/kangur/ui/components/KangurLessonsWordmark.tsx`
- `Let's play` wordmark: `src/features/kangur/ui/components/KangurGrajmyWordmark.tsx`
- Kangur setup wordmark: `src/features/kangur/ui/components/KangurKangurWordmark.tsx`
- Training wordmark: `src/features/kangur/ui/components/KangurTreningWordmark.tsx`
- Tests wordmark: `src/features/kangur/ui/components/KangurTestsWordmark.tsx`
- Parent dashboard wordmark: `src/features/kangur/ui/components/KangurParentDashboardWordmark.tsx`
- Duels wordmark: `src/features/kangur/ui/components/KangurDuelsWordmark.tsx`

## LinkedIn social post pipeline (2026-03-17)

Kangur now ships a full LinkedIn post workflow in the admin UI, including
bilingual generation, visuals, scheduling, doc updates, and publish automation
for StudiQ and Kangur product updates.

Highlights:

- Admin surface: `/admin/kangur/social` with draft management and pipeline status.
- Bilingual generation with Brain routing and optional vision model support.
- Visual analysis from image add-ons, producing highlights and documentation
  update suggestions.
- Optional documentation diff preview and apply flow.
- Immediate publish and scheduled publish options.

Key paths:

- Admin entry: `src/features/kangur/admin/AdminKangurSocialPage.tsx`
- Pipeline UI: `src/features/kangur/admin/admin-kangur-social/*`
- Social post API: `src/app/api/kangur/social-posts/*`
- Generation + publishing: `src/features/kangur/server/social-posts-*.ts`
- Scheduler: `src/features/kangur/workers/kangurSocialSchedulerQueue.ts`

## StudiQ lesson navigation parity (2026-03-18)

Adult learner lessons now mirror the structured navigation used in the 10-year-old
Maths experience, with clickable subsection hubs and cleaner lesson lists.

Highlights:

- Dorośli lesson lists no longer rely on collapsible group containers.
- Web Dev lesson renamed to React 19.2 and now includes a Components subsection hub.
- Letter Tracing lessons render as flat, clickable items (no accordion grouping).

Key paths:

- Lessons catalog layout: `src/features/kangur/ui/pages/lessons/Lessons.Catalog.tsx`
- Web Dev lesson data: `src/features/kangur/ui/components/WebDevelopmentReactComponentsLesson.data.tsx`
- Web Dev lesson shell: `src/features/kangur/ui/components/WebDevelopmentReactComponentsLesson.tsx`
- Web Dev catalog metadata: `src/features/kangur/lessons/subjects/web-development/catalog.ts`

## Agentic Coding default for Dorośli (2026-03-18)

Adult learner sessions now default to the Agentic Coding subject (Codex 5.4),
while keeping Web Development available as an alternative track.

Highlights:

- Dorośli default subject set to Agentic Coding for faster access to the Codex 5.4 path.
- Web Development remains selectable for adult learners.

Key paths:

- Subject defaults: `src/features/kangur/lessons/lesson-catalog.ts`
- Agentic Coding catalog: `src/features/kangur/lessons/subjects/agentic-coding/catalog.ts`
- Codex 5.4 lessons: `src/features/kangur/ui/components/AgenticCodingCodex54*Lesson*.tsx`

## Social image add-ons and visual analysis (2026-03-17)

Operators can capture screenshots as reusable add-ons to enrich social posts and
trigger visual analysis.

Highlights:

- Single capture with Playwright for a specific URL or selector.
- Batch capture presets for common Kangur surfaces.
- Add-ons stored with visual summaries and highlights used by Brain.
- Visual doc update suggestions mapped to `docs/kangur/*`.

Key paths:

- Batch capture service: `src/features/kangur/server/social-image-addons-batch.ts`
- Batch capture API: `src/app/api/kangur/social-image-addons/batch/handler.ts`
- Capture presets: `src/features/kangur/shared/social-capture-presets.ts`
- Vision analysis: `src/features/kangur/server/social-posts-vision.ts`
- Doc update planning: `src/features/kangur/server/social-posts-doc-updates.ts`

## Scheduled publishing and automation (2026-03-17)

Social posts can be scheduled and published automatically.

Highlights:

- Scheduled posts are published via the `kangur-social-scheduler` queue.
- Manual trigger endpoint for admin operations.
- Publish flow writes LinkedIn IDs and URLs back to the post record.

Key paths:

- Scheduler queue: `src/features/kangur/workers/kangurSocialSchedulerQueue.ts`
- Publish orchestrator: `src/features/kangur/server/social-posts-publish.ts`
- LinkedIn publish integration: `src/features/kangur/server/social-posts-publish.linkedin.ts`
- Publish scheduled endpoint: `src/app/api/kangur/social-posts/publish-scheduled/handler.ts`

## Progress and scoring backend improvements (2026-03-06)

Progress and scoring data are now surfaced through dedicated repositories and
APIs to support learner insights and dashboards.

Highlights:

- Progress repository and API endpoint for learner progress sync.
- Score repository integration for accuracy and history insights.
- Progress sync provider used by learner profile and parent dashboard surfaces.

Key paths:

- Progress API: `src/app/api/kangur/progress/handler.ts`
- Progress repository: `src/features/kangur/services/kangur-progress-repository/*`
- Score repository: `src/features/kangur/services/kangur-score-repository/*`
- Progress sync provider: `src/features/kangur/ui/context/KangurProgressSyncProvider.tsx`

## Parent dashboard and learner insights (2026-03-06)

Learner progress visibility expanded across parent and profile surfaces.

Highlights:

- Progress overview and score history cards.
- Lesson mastery insights for focus recommendations.
- Assignment visibility enhancements.

Key paths:

- Progress overview: `src/features/kangur/ui/components/ProgressOverview.tsx`
- Score history: `src/features/kangur/ui/components/ScoreHistory.tsx`
- Lesson mastery: `src/features/kangur/ui/components/LessonMasteryInsights.tsx`
- Assignment services: `src/features/kangur/ui/services/assignments.ts`

## Game setup and training improvements (2026-03-17)

Training setup gained new staging and recommendation components.

Highlights:

- Dedicated setup and quiz stages for Kangur training sessions.
- Subject and age group sync for lesson and game planning.

Key paths:

- Setup stage: `src/features/kangur/ui/components/KangurGameSetupStage.tsx`
- Quiz stage: `src/features/kangur/ui/components/KangurGameQuizStage.tsx`
- Training setup panel: `src/features/kangur/ui/components/KangurTrainingSetupPanel.tsx`
- Subject sync: `src/features/kangur/ui/context/KangurSubjectAgeGroupSync.tsx`

## Lesson library expansion (2026-03-17)

Alphabet, English, and geometry lesson catalog entries were expanded and updated.

Key paths:

- Alphabet lessons: `src/features/kangur/ui/components/Alphabet*Lesson.tsx`
- English lessons: `src/features/kangur/ui/components/English*Lesson.tsx`
- Geometry lessons: `src/features/kangur/ui/components/Geometry*Lesson.tsx`

## Context Registry

Use the Context Registry runtime document to feed this update summary directly
into AI prompts.

- Runtime ref: `runtime:kangur:recent-features`
- Registry page node: `page:kangur-recent-features`
- Registry policy node: `policy:kangur-recent-features-source`
- Context pack: `kangur_recent_features`
- Canonical doc: `docs/kangur/recent-feature-updates.md`

## Change inventory (auto)

<!-- AUTO-GENERATED:RECENT_FEATURES_START -->
Generated at 2026-04-11T13:54:13.578Z UTC.

Window (UTC): 2026-03-29 to 2026-04-11.
Commits scanned: 84.
Files touched: 2222.

Top paths:
- Top path: `src/features/kangur/ui` (1450 files)
- Top path: `src/features/kangur/admin` (144 files)
- Top path: `src/features/kangur/social` (122 files)
- Top path: `src/features/kangur/services` (84 files)
- Top path: `src/features/kangur/server` (55 files)
- Top path: `src/features/kangur/appearance` (42 files)
- Top path: `src/app/api/kangur/ai-tutor` (25 files)
- Top path: `src/app/api/kangur/auth` (24 files)

Latest commits:
- Commit: `8a44e5270` (2026-04-11) SD
- Commit: `46d8de79a` (2026-04-10) S
- Commit: `d41660456` (2026-04-10) SD
- Commit: `74b105fe4` (2026-04-10) DS
- Commit: `d0ba134b1` (2026-04-10) D
- Commit: `30622ab3e` (2026-04-09) DS
- Commit: `4e806bae4` (2026-04-09) SD
- Commit: `2fb6dd1a3` (2026-04-09) SD

<!-- AUTO-GENERATED:RECENT_FEATURES_END -->

