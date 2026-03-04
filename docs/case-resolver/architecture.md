---
owner: 'Case Resolver Team'
last_reviewed: '2026-02-20'
status: 'active'
related_components:
  - 'src/features/case-resolver'
  - 'src/app/api/case-resolver'
  - 'src/shared/lib/queue'
---

# Case Resolver Architecture

## High-Level Design

Case Resolver is split across three layers:

1. Client/UI layer
   - React pages/components and state hooks in `src/features/case-resolver/pages` and `src/features/case-resolver/hooks`.
2. API and persistence layer
   - Next.js route handlers in `src/app/api/case-resolver/*`.
   - Workspace state stored through settings APIs with revision checks.
3. Async processing layer
   - OCR jobs handled by BullMQ worker in `src/features/case-resolver/workers/caseResolverOcrQueue.ts`.

## Workspace Persistence Flow

1. UI state is normalized and stamped with mutation metadata.
2. Client persists through `/api/settings` using:
   - `key: case_resolver_workspace_v2`
   - detached sidecars: `case_resolver_workspace_v2_history`, `case_resolver_workspace_v2_documents`
   - `expectedRevision`
   - `mutationId`
3. Server returns one of:
   - success (possibly idempotent)
   - `409 conflict` with server workspace snapshot
   - failure
4. Client conflict path refreshes and retries based on retry policy.

Implementation reference: `src/features/case-resolver/workspace-persistence.ts`.

## OCR Processing Flow

1. Client requests OCR job creation: `POST /api/case-resolver/ocr/jobs`.
2. API creates runtime job record and dispatches:
   - queue mode (preferred)
   - inline fallback (if queue unavailable)
3. Worker marks job status transitions (`queued` -> `running` -> terminal state).
4. Polling endpoint `GET /api/case-resolver/ocr/jobs/{jobId}` returns current state.
5. Manual recovery endpoint `POST /api/case-resolver/ocr/jobs/{jobId}` with `{ "action": "retry" }` creates a linked retry job.

## Performance-Critical Paths

- Case list indexing/filtering in `AdminCaseResolverCasesPage.tsx`.
- Workspace serialization and save events in `workspace-persistence.ts`.
- OCR model/provider call path in `caseResolverOcrQueue.ts`.

## Reliability Controls

- Revision-based workspace sync guards.
- Queue retry and backoff for OCR jobs.
- Timeout wrappers for external OCR providers.
- Retryable error classification and model candidate failover.
- Debug event stream (`durationMs`, `payloadBytes`, revision metadata).

## Prompt Exploder Handoff Controls

- Bridge payloads now include transfer metadata (`transferId`, `payloadVersion`, `checksum`, `status`, `expiresAt`).
- Case Resolver apply diagnostics include transfer metadata to support deterministic triage.
- Binding guardrails block cross-document/cross-session apply attempts.
- Capture mapping mutations resolve strictly against proposal target document (no implicit editing-draft fallback).
- Duplicate transfers are rejected using transfer-id idempotency cache.
