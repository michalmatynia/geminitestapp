---
owner: 'Case Resolver Team'
last_reviewed: '2026-02-20'
status: 'active'
related_components:
  - 'src/features/case-resolver/workspace-persistence.ts'
  - 'src/features/case-resolver/hooks/useCaseResolverState.ts'
---

# Runbook: Workspace Conflict Recovery

## Purpose

Use this runbook when users see repeated "workspace changed" or save conflict warnings.

## Signals

- High `persist_conflict` rate.
- Repeated `manual_save_conflict_retry_exhausted`.
- User-visible save failures with unchanged input.

## 5-Minute Triage

1. Confirm save conflict events with revision fields.
2. Compare `expectedRevision` vs `currentRevision` patterns.
3. Check if a background sync loop or multi-tab edits are causing churn.
4. Confirm whether issues are scoped to one workspace or global.

## Immediate Mitigation

1. Force fresh workspace read via snapshot path.
2. Ask affected operators to avoid parallel edits in multiple tabs during incident.
3. Temporarily reduce high-frequency mutations if a noisy automation is writing workspace.

## Deep Diagnosis

- Inspect mutation lineage (`mutationId`, `lastMutationId`).
- Validate sync effect ordering in `useCaseResolverState.ts`.
- Confirm no stale expected revision is reused across retries.

## Recovery Validation

1. Save succeeds with `persist_success`.
2. Conflict retries drop to baseline.
3. No retry exhaustion events in 30-minute window.

## Escalation

- Primary: Case Resolver frontend owner.
- Secondary: settings API owner.

## Rollback Criteria

- If conflict recovery success remains < 97% after mitigation and issue started after release.

## Post-Incident

- Add regression test for identified conflict pattern.
- Document root cause in `docs/case-resolver/changelog.md`.
