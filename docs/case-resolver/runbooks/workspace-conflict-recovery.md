---
owner: 'Case Resolver Team'
last_reviewed: '2026-03-26'
status: 'active'
related_components:
  - 'src/features/case-resolver/workspace-persistence.ts'
  - 'src/features/case-resolver/workspace-persistence-fetch.ts'
  - 'src/features/case-resolver/workspace-persistence-save.ts'
  - 'src/features/case-resolver/hooks/useCaseResolverState.ts'
---

# Runbook: Workspace Conflict Recovery

## Purpose

Use this runbook when users see repeated "workspace changed" warnings, persistent save
conflicts, or repeated refresh/persist retries in the shared-settings-backed workspace lane.

## Signals

- High `persist_conflict` rate.
- Repeated `manual_save_conflict_retry_exhausted`.
- Spikes in `refresh_attempt_failed` around the same period.
- User-visible save failures with unchanged input.

## 5-Minute Triage

1. Confirm conflict or retry events with `expectedRevision`, `currentRevision`, and
   `workspaceRevision`.
2. Determine whether the failure is on the main workspace record or the detached
   documents/history keys fetched through `/api/settings`.
3. Check whether a background sync loop, multi-tab edits, or high-frequency automation
   is causing revision churn.
4. Confirm whether the problem is isolated to one workspace, one document/file, or is
   global across operators.

## Immediate Mitigation

1. Force a fresh workspace read through the shared settings snapshot path.
2. Ask affected operators to avoid parallel edits in multiple tabs during incident.
3. If one document is affected, refresh the detached document/history payloads for that
   file before asking the user to retry.
4. Temporarily reduce high-frequency mutations if a noisy automation is writing workspace.

## Deep Diagnosis

- Inspect mutation lineage (`mutationId`, `lastMutationId`).
- Validate light/heavy fetch fallback ordering and required-file hydration.
- Validate sync effect ordering in `useCaseResolverState.ts`.
- Confirm no stale expected revision is reused across retries.

## Recovery Validation

1. Save succeeds with `persist_success`.
2. Conflict retries drop to baseline and `refresh_attempt_failed` stops climbing.
3. No retry exhaustion events in a 30-minute window.

## Escalation

- Primary: Case Resolver frontend owner.
- Secondary: settings API owner.
- Tertiary: platform/on-call if `/api/settings` transport failures are global.

## Rollback Criteria

- If conflict recovery success remains < 97% after mitigation and issue started after release.

## Post-Incident

- Add regression test for identified conflict pattern.
- Document root cause in `docs/case-resolver/changelog.md`.
