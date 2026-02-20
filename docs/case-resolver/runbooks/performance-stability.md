---
owner: "Case Resolver Team"
last_reviewed: "2026-02-20"
status: "active"
related_components:
  - "src/features/case-resolver/workspace-persistence.ts"
  - "src/features/case-resolver/components/CaseResolverWorkspaceDebugPanel.tsx"
---

# Runbook: Case Resolver Performance and Stability

## Purpose

Use this runbook when Case Resolver is slow, unstable, or has elevated save/OCR failure rates.

## SLO and Alert Thresholds

- Save latency: `p95 >= 700ms` (warning), `p95 >= 1200ms` (critical).
- Conflict recovery success: `< 99%` (warning), `< 97%` (critical).
- OCR success after retries: `< 98.5%` (warning), `< 96%` (critical).
- Case list interaction: `p95 >= 100ms` (warning), `>= 180ms` (critical).

## 5-Minute Triage

1. Confirm current deploy version and whether issue started after release.
2. Check save telemetry events (`persist_*`, `refresh_*`) and durations.
3. Check OCR queue failure/retry patterns and `attemptsMade/maxAttempts`.
4. Validate whether issue is global or tied to large workspaces only.
5. Verify whether payload guardrails are rejecting oversized saves.
5. Decide mitigation path:
   - revert release
   - reduce load
   - apply feature-level workaround

## Diagnostics

### Validation Commands

- `npx vitest run src/features/case-resolver/__tests__ --reporter=dot`
- `npx eslint src/features/jobs/workers/caseResolverOcrQueue.ts src/features/case-resolver/server/ocr-runtime-job-store.ts`

### Signals to Inspect

- Workspace debug stream values:
  - `durationMs`
  - `payloadBytes`
  - revision deltas for conflict cases
  - conflict retry delay (`manual_save_conflict_retry`)
- OCR logs:
  - transient retries
  - final failures
  - model failover attempts
  - `errorCategory`, `retryableError`, `correlationId`

## Mitigation Steps

1. If save latency regression is tied to payload size:
   - limit heavy operations and ask operators to split large batches.
   - check for `persist_rejected_payload_too_large` events and support workspace cleanup.
2. If conflicts spike:
   - force fresh sync by reloading settings snapshot path.
   - validate auto-retry delay behavior (backoff + jitter) is present.
3. If OCR provider instability is detected:
   - switch to alternate model chain ordering.
   - use `errorCategory` and `retryableError` to separate transient from hard failures.
4. If case list rendering regresses:
   - use batched rendering path and verify list mode behavior.

## Escalation

- Primary: Case Resolver on-call engineer.
- Secondary: Platform/Queue owner.
- Escalate to incident channel when critical threshold breached for > 15 minutes.

## Rollback Criteria

Rollback recommended when any critical threshold remains breached after one mitigation cycle (15-30 min) and cause is tied to current release.

## Post-Incident

1. Record timeline and blast radius.
2. Capture key metrics before/after mitigation.
3. Open follow-up tasks for root-cause fix and tests.
4. Update this runbook and `docs/case-resolver/changelog.md`.
