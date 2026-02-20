---
owner: "Case Resolver Team"
last_reviewed: "2026-02-20"
status: "active"
related_components:
  - "src/features/case-resolver"
  - "src/app/api/case-resolver"
---

# Case Resolver Changelog

## 2026-02-20

- Added centralized Case Resolver documentation set under `docs/case-resolver/`.
- Added comprehensive runbook set for operations and incident response.
- Added OCR manual retry documentation and model-chain failover guidance.
- Added centralized docs integration in `docs/README.md` and ownership registry in `docs/OWNERS.md`.
- Added workspace conflict retry hardening with exponential backoff and jitter.
- Added workspace payload-size guardrail before save persistence.
- Added OCR correlation IDs and error taxonomy (`errorCategory`, `retryableError`) in runtime job records.
- Added focused CI regression workflow for Case Resolver save/OCR runtime paths.
- Added `GET /api/case-resolver/ocr/observability` snapshot endpoint for OCR SLO monitoring.
- Added workspace debug observability snapshot (`p95`, conflict/success rates, payload trends) in debug panel.

## Changelog Entry Template

When adding a new entry, include:

1. Date (`YYYY-MM-DD`)
2. User-visible behavior changes
3. Reliability/performance/security impact
4. Required operator actions (if any)
5. Linked runbook updates (if any)
