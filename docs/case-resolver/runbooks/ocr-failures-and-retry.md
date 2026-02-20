---
owner: "Case Resolver Team"
last_reviewed: "2026-02-20"
status: "active"
related_components:
  - "src/features/jobs/workers/caseResolverOcrQueue.ts"
  - "src/app/api/case-resolver/ocr/jobs/handler.ts"
  - "src/app/api/case-resolver/ocr/jobs/[jobId]/handler.ts"
---

# Runbook: OCR Failures and Retry

## Purpose

Use this runbook for OCR jobs stuck, repeatedly failing, or showing provider timeout/rate-limit errors.

## Failure Types

- Retryable: timeout, `429`, transient network/provider errors.
- Non-retryable: invalid filepath, unsupported asset, hard validation errors.

## 5-Minute Triage

1. Fetch job status: `GET /api/case-resolver/ocr/jobs/{jobId}`.
2. Check fields: `status`, `errorMessage`, `attemptsMade`, `maxAttempts`, `retryOfJobId`, `model`.
3. Identify if retry budget is exhausted.
4. Confirm provider-side degradation indicators.

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

## Verification

1. New job should be returned with `retriedFromJobId` pointing to source job.
2. Dispatch mode should be `queued` or `inline`.
3. Poll new job until terminal status.
4. Confirm result text or terminal error is persisted.

## Mitigation Matrix

- Provider timeouts/rate limits:
  - use multi-model chain with alternative provider.
- Queue dispatch failures:
  - verify inline fallback path and queue availability.
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
- Add/adjust retry classifier tests in `ocr-queue-model-routing.test.ts`.
