---
owner: 'Case Resolver Team'
last_reviewed: '2026-03-26'
status: 'active'
related_components:
  - 'src/features/case-resolver'
  - 'src/app/api/case-resolver'
---

# Case Resolver Changelog

## 2026-03-26

- Refreshed the Case Resolver docs to match the current shared-settings persistence model,
  including the split between the primary workspace record and detached documents/history payloads.
- Updated OCR operational documentation to reflect the live create/status/retry route family,
  returned `dispatchMode` and `correlationId` fields, and the `/api/case-resolver/ocr/observability`
  snapshot endpoint.
- Updated runbooks, security notes, performance guidance, and FAQ entries so they align with the
  active runtime and operator workflow.

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
- Added Prompt Exploder transfer metadata contract (`transferId`, `payloadVersion`, `checksum`, `status`, `expiresAt`).
- Added transfer idempotency cache to prevent duplicate Prompt Exploder apply replay after refresh or stale bridge state.
- Hardened capture mapping target resolution to proposal-bound file only (removed implicit fallback target mutation path).
- Expanded Prompt Exploder transfer diagnostics to expose transfer identity/version/status/checksum in Case Resolver UI.
- Added Prompt Exploder -> Case Resolver Capture handoff runbook.
- Added transfer lifecycle module for Prompt Exploder handoff (`pending|blocked|capture_review|applied|failed|dismissed|discarded|expired`).
- Added expired transfer recovery path in Case Resolver banner (`status=expired`, explicit discard action).
- Added bridge payload snapshot readers and expired-payload discard recovery without auto-applying stale payloads.
- Added capture mapping apply timing instrumentation (`cleanupDurationMs`, `mutationDurationMs`, `totalDurationMs`) in diagnostics/events.
- Added regression coverage for transfer lifecycle and stale transfer discard behavior.

## Changelog Entry Template

When adding a new entry, include:

1. Date (`YYYY-MM-DD`)
2. User-visible behavior changes
3. Reliability/performance/security impact
4. Required operator actions (if any)
5. Linked runbook updates (if any)
