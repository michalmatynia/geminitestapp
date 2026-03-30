---
owner: 'Case Resolver Team'
last_reviewed: '2026-03-26'
status: 'active'
related_components:
  - 'src/features/case-resolver/workspace-persistence.ts'
  - 'src/features/case-resolver/pages/AdminCaseResolverCasesPage.tsx'
  - 'src/features/case-resolver/workers/caseResolverOcrQueue.ts'
  - 'src/app/api/case-resolver/ocr/observability/handler.ts'
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
- `refresh_attempt_failed`
- `refresh_fallback_to_heavy`
- `refresh_success`
- `refresh_failed`

Key dimensions:

- `durationMs`
- `payloadBytes`
- revisions (`expectedRevision`, `currentRevision`, `workspaceRevision`)
- `mutationId`
- conflict retry delay telemetry from `manual_save_conflict_retry` events
- detached document/history hydration behavior through the shared settings lane
- derived summary snapshot from `workspace-observability.ts`:
  - save latency `p50/p95/max`
  - payload size `p50/p95/max`
  - conflict rate and save success rate

### OCR queue telemetry

- transient retry events
- attempts context (`attemptsMade`, `maxAttempts`)
- model failover warnings when chain fallback is used
- correlation propagation (`correlationId`) from API dispatch to worker execution
- error taxonomy (`errorCategory`, `retryableError`) for failed/queued-for-retry jobs
- observability snapshot API: `GET /api/case-resolver/ocr/observability?limit=50`

### Case list rendering behavior

- root-node batching (`Load more cases`)
- interaction response while filters/search are active

## Profiling Checklist

1. Run tests:
   - `npx vitest run src/features/case-resolver/__tests__ --reporter=dot`
2. Run focused lint:
   - `npx eslint src/features/case-resolver/workers/caseResolverOcrQueue.ts src/features/case-resolver/server/ocr-runtime-job-store.ts`
3. Verify save telemetry in debug panel (`dur`, `size`).
4. Verify shared settings refresh behavior, especially heavy fallback when required files are missing.
5. Exercise case list with large dataset and confirm incremental rendering remains responsive.
6. Trigger OCR with retryable failures and confirm:
   - queue retry
   - attempt counters
   - model candidate fallback logs
   - error classification and correlation ID in job payload/log context

## Performance Regression Triggers

- sustained save latency over SLO for > 15 minutes
- repeated `refresh_attempt_failed` or heavy-fallback churn on normal-sized workspaces
- OCR final failure spikes after retry budget usage
- repeated conflict retry exhaustion
- case list interaction lag on first render/filter transitions
