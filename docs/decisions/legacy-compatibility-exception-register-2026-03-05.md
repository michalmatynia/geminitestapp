---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'decision'
scope: 'repo'
canonical: true
---

# Legacy Compatibility Exception Register (2026-03-05)

Machine-readable register:

- canonical: `docs/decisions/legacy-compatibility-exception-register-2026-03-05.json`

Required fields for every exception entry:

1. `id`
2. `owner`
3. `status`
4. `category`
5. `sunsetDate`
6. `files`
7. `guardToken`

Policy:

1. Exceptions are temporary and time-boxed.
2. Expired exceptions are CI failures.
3. New compatibility paths must include an exception entry in the same PR.

Current status (2026-03-05):

- Active exceptions: `0`
