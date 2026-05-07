---
owner: 'Filemaker Team'
last_reviewed: '2026-05-06'
status: 'active'
doc_type: 'runbook'
scope: 'feature:filemaker'
canonical: true
---

# Filemaker Social Publishing Runbook

## Purpose

This runbook is the canonical workflow for creating, scheduling, and publishing
social posts from the Filemaker social publishing feature.

This doc owns the social-post workflow. Feature docs should link here rather
than duplicating scheduling, publishing, capture, or doc-update operator steps.

## Preconditions

- Admin access to `/admin/filemaker/social`.
- LinkedIn integration configured with at least one connected account
  (Admin > Integrations).
- AI Brain routing configured for `social_publishing.post_generation` and
  `social_publishing.visual_analysis`.
- Optional: Playwright node runner available for batch capture presets.
- Optional: CMS Media Library access for manual image selection.

Scope note:

- This workflow can publish updates for Filemaker-backed projects and other
  supported content sources.
- Current publishing transport is LinkedIn, but the feature is not owned by
  legacy product-specific routes.
- Social-post visuals may use screenshots, media-library assets, and generated
  add-ons; they are not restricted to lesson-illustration SVGs.

## Primary workflow (manual)

1. Create or select a draft.
2. Select the publishing connection. Confirm it is connected and not expired.
3. Add visuals.
   Choose one or more of the following: media library images, captured add-ons,
   or batch capture presets. Keep total images under 12 and add-ons under 30.
4. Add documentation references and notes.
   Use doc ids, titles, or keywords. If empty, the generator uses the default
   documentation shortlist. Notes feed the Brain prompt.
5. Generate the draft.
   This fills PL/EN titles and bodies, a documentation summary, and optional
   visual analysis if image add-ons are present.
6. Review and edit the post copy.
   Save the draft after edits.
7. Preview documentation updates (optional).
   Only available when visual doc updates were generated. Review the diff.
8. Apply documentation updates (optional).
   Applying writes to `docs/kangur/*`. Re-review before committing.
9. Publish or schedule.
   Use `Schedule` to set `scheduledAt` or `Publish now` for immediate
   posting.

## Automation pipeline (one click)

Use `Run full pipeline` to automate:

1. Batch capture presets (screenshots).
2. Save the post with captured add-ons.
3. Generate draft with visual analysis.
4. Preview documentation updates.

After the pipeline completes, review copy, doc updates, and publish.

## Scheduling and automation

- Scheduled posts are published by the `social-publishing-scheduler` queue.
- The tick interval is controlled by `SOCIAL_PUBLISHING_SCHEDULER_REPEAT_EVERY_MS`
  (minimum 30s).
- Manual trigger endpoint:
  `POST /api/filemaker/social-posts/publish-scheduled`.

## Validation checklist

- LinkedIn connection shows `Connected` and the token is not expired.
- `combinedBody` is present and looks correct in both PL/EN.
- Images and add-ons are appropriate and within limits.
- Documentation diffs (if any) are accurate and applied intentionally.
- Post status is `published` and `publishedUrl` is populated after publish.

## Troubleshooting

- LinkedIn integration missing: create it in Admin > Integrations.
- Connection not authorized or expired: reconnect LinkedIn in Admin > Integrations.
- Brain model missing: configure the `social_publishing.post_generation` or
  `social_publishing.visual_analysis` capability in AI Brain routing.
- Batch capture fails: confirm the base URL is reachable, the Playwright runner
  is healthy, and capture presets are valid for the selected content source.
- Doc update path invalid: ensure `docPath` points to a Markdown file under
  an approved documentation root.
- Publish failed: check `publishError`, verify LinkedIn token, and retry publish.

## Reference paths

- Admin route: `src/app/(admin)/admin/filemaker/social/page.tsx`
- Admin UI: `src/features/filemaker/social/AdminFilemakerSocialPage.tsx`
- Admin pipeline UI: `src/features/filemaker/social/admin/workspace/*`
- Social post API: `src/app/api/filemaker/social-posts/*`
- Social image add-on batch API:
  `src/app/api/filemaker/social-image-addons/batch/handler.ts`
- Generation and publishing:
  `src/features/filemaker/social/server/social-posts-generation.ts`,
  `src/features/filemaker/social/server/social-posts-publish.linkedin.ts`
- Doc updates: `src/features/filemaker/social/server/social-posts-docs.ts`
- Scheduler:
  `src/features/filemaker/social/workers/socialPublishingSchedulerQueue.ts`
- Capture presets:
  `src/features/filemaker/social/shared/social-capture-presets.ts`
