---
owner: 'Kangur Team'
last_reviewed: '2026-03-17'
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

This summary covers changes merged between 2026-03-04 and 2026-03-17 (inclusive).
Update this section whenever the reporting window changes.

## Refresh cadence

Run the refresh script weekly or before publishing release notes:

```bash
npm run docs:kangur:recent-features:refresh
```

Then review and update the narrative sections above using the auto inventory
output as input.

## Most recent feature addition: LinkedIn social post pipeline (2026-03-17)

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
Generated at 2026-03-17T19:43:32.490Z UTC.

Window (UTC): 2026-03-04 to 2026-03-17.
Commits scanned: 148.
Files touched: 1335.

Top paths:
- Top path: `src/features/kangur/ui` (668 files)
- Top path: `src/features/kangur/admin` (150 files)
- Top path: `src/features/kangur/server` (74 files)
- Top path: `src/features/kangur/services` (59 files)
- Top path: `src/features/kangur/legacy` (42 files)
- Top path: `src/features/kangur/shared` (35 files)
- Top path: `src/app/api/kangur/ai-tutor` (33 files)
- Top path: `src/app/api/kangur/auth` (32 files)

Latest commits:
- Commit: `8de07d2c2` (2026-03-17) SD
- Commit: `c6e79a16d` (2026-03-17) SD
- Commit: `20328a782` (2026-03-17) DS
- Commit: `61dc05260` (2026-03-17) DSD
- Commit: `96f6faaba` (2026-03-17) DS
- Commit: `e25635022` (2026-03-17) SD
- Commit: `273c51b66` (2026-03-17) SDDS
- Commit: `c03399b46` (2026-03-17) DS

<!-- AUTO-GENERATED:RECENT_FEATURES_END -->

