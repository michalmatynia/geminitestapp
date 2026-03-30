---
owner: 'Case Resolver Team'
last_reviewed: '2026-03-26'
status: 'active'
related_components:
  - 'src/features/case-resolver'
  - 'src/features/case-resolver/utils/workspace-settings-persistence-helpers.ts'
---

# Case Resolver FAQ

## Why do I see save conflict warnings?

Another workspace mutation was persisted with a newer revision before your save completed. Case Resolver refreshes latest server state and retries based on conflict policy.

## Where does the workspace actually persist?

Case Resolver persists through the shared settings surface. The main workspace lives under
`case_resolver_workspace_v2`, while detached document and history payloads are stored under
their own settings keys and hydrated separately when needed.

## Why did OCR run inline instead of queued?

If Redis or queue dispatch is unavailable, OCR falls back to inline processing to preserve functionality.

## How do I retry a failed OCR job?

Call:

- `POST /api/case-resolver/ocr/jobs/{jobId}`

with:

- `{ "action": "retry" }`

You may override model/prompt in the same payload.

The retry response also returns `dispatchMode`, `correlationId`, and the new retried job record.

## Can I provide multiple OCR models?

Yes. The OCR `model` value supports comma/semicolon/newline-separated candidates. Retryable provider failures can fall through to the next candidate.

## Why does the case list show "Load more cases"?

Case root nodes are batched to keep large-tree initial render responsive. Use the button to progressively render additional roots.

## Where is the canonical runbook set?

See `docs/case-resolver/runbooks/`.
