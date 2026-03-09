---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'policy'
scope: 'platform'
canonical: true
---

# Resource Leasing

Resource leasing is the coordination mechanism for shared agent runtime access. Agents should treat lease acquisition as a hard boundary before mutating shared state.

## When leasing is required

Use a lease when the resource is:

- exclusive by design
- expensive to initialize and intended for reuse
- stateful across multiple steps or retries
- vulnerable to conflicting writes from concurrent agents

## Partitioned resources

Some resources are partitioned rather than globally exclusive. For those resources, the lease request must include `scopeId`.

Examples:

- Playwright runtime broker: `scopeId = leaseKey`
- base import execution: `scopeId = runId`

## Current lease-aware resources

### Playwright runtime broker

- Resource id: `testing.playwright.runtime-broker`
- Mode: `partitioned`
- Scope id: broker `leaseKey`
- Why it exists: coordinate broker-managed browser/runtime partitions per agent or execution scope
- Entry points:
  - `scripts/testing/lib/runtime-broker.mjs`
  - `scripts/testing/run-playwright-suite.mjs`
  - `src/app/api/agent/leases/route.ts`

### Base import run execution

- Resource id: `integrations.base-import.run`
- Mode: `partitioned`
- Scope id: import `runId`
- Why it exists: preserve one active writer for each import run's retries, sequencing, and side effects
- Entry points:
  - `src/features/integrations/services/imports/base-import-run-repository.ts`
  - `src/features/integrations/services/imports/base-import-service.ts`

## Recommended lease fields

Lease-aware services should capture at least:

- `resourceType`
- `resourceId`
- `scopeId`
- `ownerAgentId`
- `ownerRunId`
- `mode`
- `leaseMs`
- `heartbeatMs`
- `expiresAt`
- `status`

## Lease operating rules

1. Discover the resource contract before touching the resource.
2. Acquire ownership before mutation.
3. Provide `scopeId` when the resource is partitioned.
4. Heartbeat while work is active.
5. Release ownership explicitly when possible.
6. Recover stale ownership only through the documented recovery path.

## Recovery rules

- Do not steal an active lease.
- Stale lease recovery should be deterministic and auditable.
- Recovery must preserve enough state for another agent to understand what was in progress.
- If recovery is not safe, escalate through approval or operator workflow.

## Concurrency policy

- `exclusive`: one active writer
- `shared-read`: multiple observers, no writes
- `append-only`: multiple producers writing durable events without rewriting history
- `partitioned`: independent ownership within explicitly separated scopes

## Relationship to forward-only execution

Leasing and forward-only execution are complementary:

- leasing controls who may mutate
- forward-only execution controls how mutation history is recorded

Use leasing to avoid collisions. Use forward-only events and checkpoints to make recovery and handoff possible after a collision, timeout, or interruption.

## Shared lease API

The canonical live ownership surface is:

- `GET /api/agent/leases`
- `POST /api/agent/leases`

See `docs/platform/shared-lease-service.md` for the request and response model.

## AI Paths execution leases

AI Paths queue workers now claim the partitioned `ai-paths.run.execution` resource through the shared lease service before processing a run. Use the `runId` as the `scopeId`.

- Inspect all execution scopes with `GET /api/agent/leases?resourceId=ai-paths.run.execution`
- Inspect a single run scope with `GET /api/agent/leases?resourceId=ai-paths.run.execution&scopeId=<runId>`

If a worker cannot claim the execution lease, the run is moved into `blocked_on_lease` and can later be marked `handoff_ready` for delegated continuation.
