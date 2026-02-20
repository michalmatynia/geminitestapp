---
owner: "Case Resolver Team"
last_reviewed: "2026-02-20"
status: "active"
related_components:
  - "src/features/case-resolver/workspace-persistence.ts"
  - "src/features/case-resolver/pages/AdminCaseResolverCasesPage.tsx"
  - "src/features/jobs/workers/caseResolverOcrQueue.ts"
---

# Case Resolver Performance Guide

## SLOs

- Workspace save latency: `p95 < 700ms`.
- Workspace conflict auto-recovery: `>= 99%`.
- Case list interaction latency: `p95 < 100ms`.
- OCR completion success (with retries): `>= 98.5%`.

## Instrumentation Sources

### Workspace debug stream

Emitted from `workspace-persistence.ts`:

- `persist_attempt`
- `persist_success`
- `persist_conflict`
- `persist_failed`
- `persist_rejected_payload_too_large`
- `refresh_success`
- `refresh_failed`

Key dimensions:

- `durationMs`
- `payloadBytes`
- revisions (`expectedRevision`, `currentRevision`, `workspaceRevision`)
- `mutationId`
- conflict retry delay telemetry from `manual_save_conflict_retry` events

### OCR queue telemetry

- transient retry events
- attempts context (`attemptsMade`, `maxAttempts`)
- model failover warnings when chain fallback is used
- correlation propagation (`correlationId`) from API dispatch to worker execution
- error taxonomy (`errorCategory`, `retryableError`) for failed/queued-for-retry jobs

### Case list rendering behavior

- root-node batching (`Load more cases`)
- interaction response while filters/search are active

## Profiling Checklist

1. Run tests:
   - `npx vitest run src/features/case-resolver/__tests__ --reporter=dot`
2. Run focused lint:
   - `npx eslint src/features/jobs/workers/caseResolverOcrQueue.ts src/features/case-resolver/server/ocr-runtime-job-store.ts`
3. Verify save telemetry in debug panel (`dur`, `size`).
4. Exercise case list with large dataset and confirm incremental rendering remains responsive.
5. Trigger OCR with retryable failures and confirm:
   - queue retry
   - attempt counters
   - model candidate fallback logs
   - error classification and correlation ID in job payload/log context

## Performance Regression Triggers

- sustained save latency over SLO for > 15 minutes
- OCR final failure spikes after retry budget usage
- repeated conflict retry exhaustion
- case list interaction lag on first render/filter transitions
