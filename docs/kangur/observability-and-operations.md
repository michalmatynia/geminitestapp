---
owner: 'Kangur Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'runbook'
scope: 'feature:kangur'
canonical: true
related_components:
  - 'src/features/kangur/observability/client.ts'
  - 'src/features/kangur/observability/server.ts'
  - 'src/features/kangur/observability/summary.ts'
  - 'src/app/api/kangur/observability/summary/handler.ts'
---

# Runbook: Kangur Observability and Operations

## Purpose

Use this runbook when Kangur shows elevated sign-in failures, progress sync issues, narration/TTS degradation, or feature-level regressions that need a fast operational read.

This runbook now covers both the canonical web shell and the native mobile app,
because they share the same `/api/kangur/*` backend and observability sources.

## Primary Surfaces

- Admin dashboard:
  - `/admin/kangur/observability`
- Summary API:
  - `GET /api/kangur/observability/summary?range=24h|7d|30d`
  - Access requires an elevated session or `settings.manage`.
- System log metrics:
  - `GET /api/system/logs/metrics?source=kangur.`
- Saved log presets:
  - `Kangur`
  - `Kangur Auth`
  - `Kangur Progress`
  - `Kangur Slow Sync`
  - `Kangur TTS`
- Performance artifact:
  - `docs/metrics/kangur-performance-latest.json`
  - `docs/metrics/kangur-performance-latest.md`
- Public web analytics mount:
  - `src/app/(frontend)/kangur/layout.tsx`
  - `src/features/kangur/ui/FrontendPublicOwnerKangurShell.tsx`
  - uses `@vercel/analytics` for pageview coverage on canonical Kangur web routes and root-owned public-owner routes only
- Startup behavior:
  - mobile startup and home-shell regressions should be correlated with the Kangur performance artifact before treating them as isolated client bugs

## Alert Thresholds

- Kangur server error rate:
  - warning at `>= 2%`
  - critical at `>= 5%`
  - requires at least `20` Kangur log entries in the selected window
- Learner sign-in failure rate:
  - warning at `>= 5%`
  - critical at `>= 10%`
  - requires at least `10` sign-in attempts in the selected window
- Progress sync failures:
  - warning at `>= 3` failures per `24h`
  - critical at `>= 10` failures per `24h`
  - the summary API scales these thresholds for `7d` and `30d`
- Progress sync route latency:
  - warning when `p95 >= 750 ms`
  - critical when `p95 >= 1500 ms`
  - requires at least `10` progress `PATCH` requests in the selected window
- TTS fallback rate:
  - warning at `>= 10%`
  - critical at `>= 25%`
  - requires at least `10` TTS requests in the selected window
- Performance baseline:
  - unit failure: critical
  - E2E failure: critical
  - E2E infra failure: warning

## 5-Minute Triage

1. Open `/admin/kangur/observability` or `GET /api/kangur/observability/summary?range=24h`.
2. Check `overallStatus`, then read the triggered alerts in order.
3. If auth is degraded:
   - inspect `analytics.importantEvents` for `kangur_learner_signin_failed`
   - apply the `Kangur Auth` preset
4. If progress is degraded:
   - inspect `analytics.importantEvents` for `kangur_progress_sync_failed`
   - apply the `Kangur Progress` preset
   - if the issue is latency rather than outright failures, apply the `Kangur Slow Sync` preset
5. If narration is degraded:
   - inspect `keyMetrics.ttsFallbackRatePercent`
   - apply the `Kangur TTS` preset
   - verify `POST /api/kangur/tts/status` still returns expected states for affected lessons
6. Check `performanceBaseline` to rule out a broader feature regression or missing local stack.

## Signal Map

### Auth

- Client events:
  - `kangur_learner_signin_succeeded`
  - `kangur_learner_signin_failed`
- Server sources:
  - `kangur.auth.learnerSignIn.success`
  - `kangur.auth.learnerSignIn.failed`
  - `kangur.auth.me`
- Route metrics:
  - `kangur.auth.learnerSignIn.POST`
  - `kangur.auth.me.GET`

### Progress

- Client events:
  - `kangur_progress_hydrated`
  - `kangur_progress_hydration_failed`
  - `kangur_progress_sync_failed`
- Server sources:
  - `kangur.progress.update`
- Route metrics:
  - `kangur.progress.PATCH`

Mobile startup also depends on this surface indirectly because persisted lesson
and progress-derived snapshots are refreshed after the deferred home progress
stage opens.

### Scores, Learners, Assignments

- Server sources:
  - `kangur.scores.create`
  - `kangur.learners.create`
  - `kangur.learners.update`
  - `kangur.assignments.create`
  - `kangur.assignments.update`
- Route metrics:
  - `kangur.scores.POST`
  - `kangur.learners.POST`
  - `kangur.assignments.POST`

### Narration and TTS

- Server sources:
  - `kangur.tts.generate`
  - `kangur.tts.fallback`
  - `kangur.tts.generationFailed`
  - `kangur.tts.probe.ready`
  - `kangur.tts.probe.failed`
- Route metrics:
  - `kangur.tts.POST`
  - `kangur.tts.status.POST`
  - `kangur.tts.probe.POST`

### AI Tutor

- Client events:
  - `kangur_ai_tutor_opened`
  - `kangur_ai_tutor_closed`
  - `kangur_ai_tutor_anchor_changed`
  - `kangur_ai_tutor_motion_completed`
  - `kangur_ai_tutor_context_switched`
  - `kangur_ai_tutor_quick_action_clicked`
  - `kangur_ai_tutor_follow_up_clicked`
  - `kangur_ai_tutor_follow_up_completed`
  - `kangur_ai_tutor_feedback_submitted`
  - `kangur_ai_tutor_repeat_question_detected`
  - `kangur_ai_tutor_recovery_after_hint`
  - `kangur_ai_tutor_message_sent`
  - `kangur_ai_tutor_message_succeeded`
  - `kangur_ai_tutor_message_failed`
  - `kangur_ai_tutor_quota_exhausted`
- Server sources:
  - `kangur.ai-tutor.chat.completed`
  - `kangur.ai-tutor.chat.failed`
- Summary surfaces:
  - `AI Tutor Bridge Snapshot` on `/admin/kangur/observability`
  - `kangur-ai-tutor-bridge-completion-rate` alert when bridge suggestions stop converting into completed cross-surface follow-ups

### Social updates and publishing

- Server sources:
  - `kangur.social-posts.*`
  - `kangur.social-pipeline.*`
- Operational surfaces:
  - `/admin/kangur/social`
  - `/api/kangur/social-pipeline/status`
  - `/api/kangur/social-posts/*`

## Mitigation Paths

### Learner sign-in failures spike

1. Confirm the spike is real in `analytics.importantEvents`.
2. Review `kangur.auth.learnerSignIn.failed` logs for common actor or owner context.
3. Check recent auth-provider, learner password, or session changes.
4. If failure started after release, rollback the release or disable the affected auth path.

### Progress sync failures spike

1. Confirm whether the issue is client hydration, client sync, or server `PATCH` failures.
2. Review `kangur_progress_sync_failed` client events and `kangur.progress.PATCH` route metrics together.
3. If route p95 latency is elevated, open the slow-sync logs view or apply the `Kangur Slow Sync` preset.
4. Check learner ownership resolution and progress repository health.
5. If degradation is isolated to one learner or parent account, use `requestId` and `traceId` to follow the path through server logs.

### TTS fallback rate spikes

1. Check whether fallbacks are `tts_unavailable`, `generation_failed`, or `empty_script`.
2. Verify the AI Brain OpenAI provider credential and the storage path used by Kangur narration.
3. If fallbacks are `generation_failed`, inspect `kangur.tts.generationFailed` logs for `failureStage`.
4. Typical stages are `openai_speech`, `audio_buffer`, and `storage_upload`.
5. For `openai_speech`, also inspect `errorStatus` and `errorCode`.
6. `errorCode=billing_not_active` means the configured OpenAI account exists but billing is inactive, so neural narration will not recover until billing is re-enabled.
7. Kangur settings now runs a silent narrator probe automatically when the page opens or the server voice changes, and the manual `Test server narrator` action remains available for explicit retests.
8. Use browser fallback as the short-term mitigation; do not block lesson playback on TTS readiness.
9. If only one lesson is affected, inspect `POST /api/kangur/tts/status` for that lesson draft.

### AI Tutor bridge conversion degrades

1. Review the `AI Tutor Bridge Snapshot` cards in `/admin/kangur/observability`.
2. Compare bridge suggestions against bridge completions; low completion with normal suggestion volume usually means the tutor is proposing the right next step but the CTA or destination is not compelling enough.
3. Inspect recent analytics for `kangur_ai_tutor_message_succeeded`, `kangur_ai_tutor_quick_action_clicked`, `kangur_ai_tutor_follow_up_clicked`, and `kangur_ai_tutor_follow_up_completed`.
4. Check whether the drop is isolated to `Lekcja -> Grajmy` or `Grajmy -> Lekcja`.
5. If the issue started after a tutor prompt or widget copy change, review the latest bridge-action wording and adjacent-step ranking in the AI Tutor adaptive layer.

### Performance artifact degrades

1. Re-run `npm run metrics:kangur:baseline:strict`.
2. Distinguish real test failures from infra failures such as a missing local server on `http://localhost:3000`.
3. If the regression is mobile-startup-specific, compare the change against the staged home/bootstrap path before blaming the backend.
4. If unit status regresses after a release, treat it as a feature stability incident rather than a telemetry-only issue.

## Escalation

- Primary: Kangur feature owner or on-call engineer.
- Secondary: platform owner when system log storage, analytics storage, auth provider, or OpenTelemetry surfaces are degraded.
- Escalate to incident response when a critical Kangur alert stays active for more than 15 minutes.

## Post-Incident

1. Capture the summary payload used during triage.
2. Record the triggering alert, request IDs, and top affected learner or parent contexts.
3. Add missing telemetry when the root cause required raw log inspection or manual correlation.
4. Update this runbook when thresholds, sources, or mitigation steps change.
