---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'policy'
scope: 'platform'
canonical: true
---

# Forward-Only Execution

Forward-only execution means agent work is coordinated through durable events, checkpoints, and ownership changes rather than destructive rewrites of shared state.

## Core rules

1. Record progress as append-only events.
2. Checkpoint at every durable boundary.
3. Resume from the last known checkpoint instead of replaying hidden mutable state.
4. Hand off blocked work instead of forcing concurrent mutation.
5. Gate destructive recovery through approval.

## Why this matters for concurrent agents

Concurrent agentic coding fails when multiple agents rely on hidden mutable state. Forward-only execution reduces that risk by making progress explicit:

- event logs show what happened
- checkpoints show where to resume
- leases show who owns the next mutation
- approvals show why exceptional access was granted

## Recommended run lifecycle

1. Discover capabilities and resource requirements.
2. Acquire ownership or confirm read-only access.
3. Execute the next step.
4. Emit the result as an event.
5. Write a checkpoint if the step changes durable state.
6. Continue, hand off, or release ownership.

## Conflict handling

When an agent cannot safely continue:

- emit a blocked or waiting state
- capture the blocker in the checkpoint or event stream
- release or retain the lease according to the resource contract
- hand off the run if another agent or operator should continue

Do not silently overwrite shared state to make the conflict disappear.

## Relationship to current contracts

The existing contract surface for this model is already present in:

- `src/shared/contracts/agent-runtime.ts`
- `src/shared/contracts/ai-paths.ts`

The capability manifest at `/api/agent/capabilities` is the discovery layer that tells an agent which surfaces already support this model and which are still partial.
