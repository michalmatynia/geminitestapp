---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'decision'
scope: 'repo'
canonical: true
---

# Legacy Compatibility Exception Register (2026-03-04)

Machine-readable register:

- canonical: `docs/decisions/legacy-compatibility-exception-register-2026-03-04.json`

Each exception entry is required to have:

1. `id`
2. `owner`
3. `status`
4. `category`
5. `sunsetDate`
6. `files`
7. `guardToken`

Policy:

1. Exceptions are temporary.
2. Expired exceptions are CI failures.
3. New compatibility paths must be added here in the same PR or they are rejected by guardrail checks.

Current status (2026-03-04):

- Active exceptions: `0`
