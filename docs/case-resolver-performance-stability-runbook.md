# Case Resolver Performance & Stability Runbook

## Scope

This runbook defines runtime targets, validation gates, and rollout checks for the Case Resolver feature.

## Runtime Targets

1. Workspace save latency `p95 < 700ms` for standard payloads.
2. Automatic CAS conflict recovery success `>= 99%`.
3. Case list filter/sort interaction `p95 < 100ms` on benchmark dataset.
4. OCR job completion success `>= 98.5%` (including retries).

## Signals to Monitor

1. Workspace debug stream:
   - `persist_attempt`, `persist_success`, `persist_conflict`, `persist_failed`
   - `durationMs`, `payloadBytes`, revision deltas.
2. OCR queue logs:
   - transient retry events
   - final failure events with `attemptsMade/maxAttempts`.
3. Regression signals:
   - conflict retry exhaustion events
   - repeated manual save errors
   - OCR queue backlog growth.

## Validation Checklist (Pre-Release)

1. Run Case Resolver tests:
   - `npx vitest run src/features/case-resolver/__tests__`
2. Run lint on touched files:
   - `npx eslint src/features/case-resolver src/features/jobs/workers/caseResolverOcrQueue.ts src/shared/lib/queue/queue-factory.ts`
3. Confirm no new failing API behavior in:
   - `/api/case-resolver/ocr/jobs`
   - `/api/settings` CAS write path.
4. Verify debug panel shows `durationMs` and `payloadBytes` for persistence events.

## Rollout Strategy

1. Deploy to preview/staging and execute save/conflict/OCR smoke tests.
2. Enable production for a limited operator cohort first.
3. Watch save conflict/error and OCR failure rates for one full working day.
4. Ramp to full traffic only if all runtime targets remain green.
5. Roll back if any target is exceeded for sustained periods.

## Post-Rollout Audit

1. Export one-day event sample and compare against baseline.
2. Record:
   - save `p50/p95`
   - conflict recovery ratio
   - OCR retry ratio and final failure ratio.
3. Open follow-up items for any target drift.
