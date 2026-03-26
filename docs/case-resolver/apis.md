---
owner: 'Case Resolver Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'reference'
scope: 'feature:case-resolver'
canonical: true
related_components:
  - 'src/app/api/case-resolver'
---

# Case Resolver API Reference

This document covers the feature-owned `/api/case-resolver/*` routes.

Important boundary:

- the interactive workspace does not persist through a dedicated Case Resolver API namespace
- workspace persistence is handled through shared settings-backed flows documented in [./architecture.md](./architecture.md) and [./data-model.md](./data-model.md)

## Assets

### `POST /api/case-resolver/assets/upload`

Purpose:

- upload one or more Case Resolver assets

Input:

- `multipart/form-data` with `file`, `files`, or `image`
- optional `folder`

Behavior:

- infers asset kind
- resolves the Case Resolver storage folder
- stores files under the Case Resolver upload category

### `POST /api/case-resolver/assets/extract-pdf`

Purpose:

- extract plain text from an uploaded PDF

Input JSON:

- `filepath` under `/uploads/case-resolver/`

Output JSON:

- `filepath`
- `text`
- `pageCount`

## Documents

### `POST /api/case-resolver/documents/export-pdf`

Purpose:

- render provided HTML and return PDF bytes

Input JSON:

- `html` required
- `filename` optional and sanitized

Output:

- `application/pdf` binary response

## OCR

### `GET /api/case-resolver/ocr/models`

Purpose:

- list OCR-capable model candidates from the configured providers

Output summary:

- `models`
- `ollamaModels`
- `otherModels`
- `keySource`
- optional `warning`

### `POST /api/case-resolver/ocr/jobs`

Purpose:

- create and dispatch an OCR runtime job

Input JSON:

- `filepath` required
- `model` optional
- `prompt` optional
- `correlationId` optional

Output summary:

- `job`
- `dispatchMode` (`queued` or `inline`)
- `correlationId`

### `GET /api/case-resolver/ocr/jobs/{jobId}`

Purpose:

- read OCR job state and result

Output summary:

- `job`

### `POST /api/case-resolver/ocr/jobs/{jobId}`

Purpose:

- create a retry job linked to the source OCR job

Input JSON:

- `action: "retry"` required
- `model` optional override
- `prompt` optional override
- `correlationId` optional

Output summary:

- `job`
- `dispatchMode`
- `retriedFromJobId`
- `correlationId`

### `GET /api/case-resolver/ocr/observability`

Purpose:

- return OCR operational telemetry and recent status breakdowns

Query parameters:

- `limit` optional, max `400`

Output summary:

- `snapshot.sampleSize`
- `snapshot.statuses`
- `snapshot.successRate`
- `snapshot.retryRate`
- `snapshot.retryableFailureRate`
- `snapshot.failureCategories`
- `snapshot.completionLatencyMs`
- `snapshot.backlogAgeMs`
- `snapshot.distinctCorrelationIds`

## Error model

Case Resolver handlers use standardized app-error helpers such as:

- `badRequestError`
- `notFoundError`
- `operationFailedError`

Common failure classes:

- validation failures
- path-safety violations
- OCR provider/runtime failures
- queue dispatch failures

## What is intentionally not listed here

This page does not pretend the following are Case Resolver API routes:

- the shared workspace persistence writes via `/api/settings`
- Prompt Exploder transfer state is a cross-feature bridge contract rather than a Case Resolver route family

Use the architecture and runbooks for those layers instead.
