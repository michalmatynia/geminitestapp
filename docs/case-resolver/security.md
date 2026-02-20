---
owner: "Case Resolver Team"
last_reviewed: "2026-02-20"
status: "active"
related_components:
  - "src/app/api/case-resolver/assets/extract-pdf/handler.ts"
  - "src/features/case-resolver/server/ocr-runtime.ts"
  - "src/app/api/case-resolver/documents/export-pdf/handler.ts"
---

# Case Resolver Security Notes

## Threat Surfaces

- user-provided file uploads
- public filepath to disk-path resolution
- OCR provider requests and API keys
- HTML-to-PDF rendering input

## Current Controls

1. Path safety constraints
   - OCR and PDF extract handlers only accept files under `/uploads/case-resolver/`.
   - Disk paths are validated against allowed prefix.
2. Input validation
   - route handlers validate payload shape and required fields.
3. API key handling
   - OCR provider keys are resolved through settings/env and not exposed to client.
4. PDF export guardrails
   - payload size cap and filename sanitization.
5. Error handling
   - standardized app errors, avoiding raw stack leakage in user-facing responses.

## Operational Security Practices

- rotate OCR provider keys on schedule and after incidents.
- ensure production logs do not include OCR source data bodies.
- audit case upload locations and retention periodically.
- review third-party OCR model/provider allowlist quarterly.

## Known Security Constraints

- OCR text may contain sensitive case data; apply least-privilege access to logs/storage.
- Manual retry endpoint for OCR should remain admin/protected in deployment policy.
