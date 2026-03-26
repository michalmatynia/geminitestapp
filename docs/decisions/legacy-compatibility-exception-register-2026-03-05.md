---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'decision'
scope: 'repo'
canonical: true
---

# Legacy Compatibility Exception Register (2026-03-05)

This register remains the canonical policy surface for temporary compatibility
allowances. The active migration closeout trackers in `docs/plans/` and
`docs/migrations/` should reference this file instead of restating exception policy.

Use this file for the governing exception policy and the human-readable status
summary. Use the JSON companion below as the tooling-facing source for exact
active entries and CI enforcement.

Current migration execution context:

- [`../plans/canonical-closeout-2026-04-17.md`](../plans/canonical-closeout-2026-04-17.md)
- [`../migrations/wave-execution-status-2026-04-17.md`](../migrations/wave-execution-status-2026-04-17.md)
- [`../migrations/stabilization-window-2026-04-17.md`](../migrations/stabilization-window-2026-04-17.md)

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
