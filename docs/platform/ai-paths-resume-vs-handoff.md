---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'reference'
scope: 'platform'
canonical: true
---

# AI Paths resume vs handoff

Use `resume` and `handoff` for different operational situations. They are not interchangeable.

## Use `resume`

Choose `resume` when the same run should continue under normal orchestration.

Typical cases:
- the queue worker is healthy again after a transient outage
- the run was paused intentionally and should continue
- a retry should continue from the same ownership model

`resume` assumes the run can re-enter normal execution without changing ownership expectations.

## Use `handoff`

Choose `handoff` when the current execution context should be delegated.

Typical cases:
- the run is `blocked_on_lease` and the current owner is not expected to release soon
- another agent or operator must continue from the existing checkpoint lineage
- the run should be marked ready for delegated continuation instead of being forced back into queue execution

`handoff` moves the run into `handoff_ready` and preserves continuation context in run metadata.

## Recommended operator flow

1. Inspect the run status.
2. If the run is `blocked_on_lease`, inspect ownership with `GET /api/agent/leases?resourceId=ai-paths.run.execution&scopeId=<runId>`.
3. If the current owner is expected to complete soon, wait or retry with `resume` after the lease is released.
4. If ownership contention is durable or work should change hands, mark the run handoff-ready from the run history list or run detail dialog, or call `POST /api/ai-paths/runs/[runId]/handoff`.
5. Resume delegated work from the preserved checkpoint lineage.

## Current operator entry points

- Run history list: blocked runs expose `Mark handoff-ready`
- Run detail dialog: blocked runs expose `Mark handoff-ready` and current owner context
- Queue run card: blocked and handoff-ready runs show coordination guidance
- Canvas sidebar: blocked and handoff-ready runs show runtime coordination guidance instead of active-run controls

## Practical rule

- `resume`: continue the same execution path
- `handoff`: preserve context and transfer responsibility
