---
owner: 'Case Resolver Team'
last_reviewed: '2026-03-26'
status: 'active'
related_components:
  - 'src/features/case-resolver/workers/caseResolverOcrQueue.ts'
  - 'src/app/api/case-resolver/ocr/jobs/handler.ts'
  - 'src/app/api/case-resolver/ocr/jobs/handler.impl.ts'
  - 'src/app/api/case-resolver/ocr/jobs/[jobId]/handler.ts'
  - 'src/app/api/case-resolver/ocr/observability/handler.ts'
  - 'src/features/case-resolver/server/ocr-observability.ts'
  - 'src/features/case-resolver/server/ocr-runtime-job-store.ts'
---

# Runbook: OCR Failures and Retry

## Purpose

Use this runbook for OCR jobs that stall, repeatedly fail, or show provider, queue,
or dispatch instability.

## Failure Types

- Retryable: `timeout`, `rate_limit`, transient `network`, and some provider-side failures
  where `retryableError=true`.
- Non-retryable: invalid filepath, unsupported asset, hard validation failures,
  or jobs where `retryableError=false`.

## 5-Minute Triage

1. Fetch job status: `GET /api/case-resolver/ocr/jobs/{jobId}`.
2. Pull the current aggregate view: `GET /api/case-resolver/ocr/observability?limit=50`.
3. Check job fields: `status`, `dispatchMode`, `errorMessage`, `errorCategory`,
   `retryableError`, `attemptsMade`, `maxAttempts`, `retryOfJobId`, `correlationId`,
   `startedAt`, `finishedAt`, and `model`.
4. Identify whether the source job exhausted its retry budget or whether a later retry
   in the same chain is already progressing.
5. Confirm whether the degradation is provider-side, queue/dispatch-side, or isolated to one asset.

## Manual Recovery

### Standard retry

- `POST /api/case-resolver/ocr/jobs/{jobId}`
- body: `{ "action": "retry" }`

### Retry with model override

- `POST /api/case-resolver/ocr/jobs/{jobId}`
- body:
  - `{ "action": "retry", "model": "openai:gpt-4o-mini, gemini:gemini-1.5-pro" }`

### Retry with prompt override

- `POST /api/case-resolver/ocr/jobs/{jobId}`
- body:
  - `{ "action": "retry", "prompt": "Extract all readable text..." }`

### Retry with correlation override

- `POST /api/case-resolver/ocr/jobs/{jobId}`
- body:
  - `{ "action": "retry", "correlationId": "case-resolver-ocr-incident-2026-03-26" }`

## Verification

1. New job should be returned with `retriedFromJobId` pointing to the source job.
2. Response should include `dispatchMode` and `correlationId`.
3. Latest job record should move into `queued` or `running` quickly, then settle into
   `completed` or `failed`.
4. Confirm result text or terminal error is persisted on the new job record.
5. Re-check `/api/case-resolver/ocr/observability` to confirm the retry chain is visible
   and that failure category counts are not still climbing.

## Mitigation Matrix

- Provider timeouts/rate limits:
  - use multi-model chain with alternative provider and watch `errorCategory` plus
    `retryableError` in the retry chain.
- Queue dispatch failures:
  - verify `dispatchMode`, inline fallback behavior, and queue availability.
- Invalid filepath errors:
  - validate upload location and file type restrictions.

## Escalation

- Primary: Case Resolver on-call.
- Secondary: Queue/Redis owner.
- Tertiary: External provider support if widespread upstream outage.

## Rollback Trigger

- OCR final failure ratio > 4% for 30 minutes after retries/overrides.

## Post-Incident

- Add model-chain tuning updates to this runbook.
- Add or adjust retry/observability coverage in `src/features/case-resolver/__tests__/ocr-observability.test.ts`
  and the OCR handler tests.
