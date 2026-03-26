---
owner: 'Case Resolver Team'
last_reviewed: '2026-03-26'
status: 'active'
related_components:
  - 'src/app/api/case-resolver/assets/extract-pdf/handler.ts'
  - 'src/features/case-resolver/server/ocr-runtime.ts'
  - 'src/app/api/case-resolver/documents/export-pdf/handler.ts'
  - 'src/features/case-resolver/utils/workspace-settings-persistence-helpers.ts'
---

# Case Resolver Security Notes

## Threat Surfaces

- user-provided file uploads
- public filepath to disk-path resolution
- OCR provider requests and API keys
- HTML-to-PDF rendering input
- shared-settings-backed workspace persistence payloads
- OCR job status and retry endpoints

## Current Controls

1. Path safety constraints
   - OCR and PDF extract handlers only accept files under `/uploads/case-resolver/`.
   - Disk paths are validated against allowed prefix.
2. Input validation
   - route handlers validate payload shape and required fields.
3. Shared settings persistence
   - workspace payloads are stored behind shared settings keys and detached documents/history records,
     so access control on the settings surface is part of the Case Resolver security boundary.
4. API key handling
   - OCR provider keys are resolved through settings/env and not exposed to client.
5. OCR operational endpoints
   - OCR create/status/retry/observability routes must remain admin/protected in deployment policy.
   - Correlation identifiers are operational metadata only and must not include case content.
6. PDF export guardrails
   - payload size cap and filename sanitization.
7. Error handling
   - standardized app errors, avoiding raw stack leakage in user-facing responses.

## Operational Security Practices

- rotate OCR provider keys on schedule and after incidents.
- ensure production logs do not include OCR source data bodies.
- ensure shared settings payload inspection is limited to authorized operators.
- audit case upload locations and retention periodically.
- review third-party OCR model/provider allowlist quarterly.

## Known Security Constraints

- OCR text may contain sensitive case data; apply least-privilege access to logs/storage.
- Detached document/history payloads can contain the most sensitive document content and should be
  treated with the same care as the primary workspace record.
- Manual retry endpoint for OCR should remain admin/protected in deployment policy.
