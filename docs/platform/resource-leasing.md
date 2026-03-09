# Resource Leasing

Resource leasing is the coordination mechanism for shared agent runtime access. Agents should treat lease acquisition as a hard boundary before mutating shared state.

## When leasing is required

Use a lease when the resource is:

- exclusive by design
- expensive to initialize and intended for reuse
- stateful across multiple steps or retries
- vulnerable to conflicting writes from concurrent agents

## Current lease-aware resources

### Playwright runtime broker

- Resource id: `testing.playwright.runtime-broker`
- Mode: `exclusive`
- Why it exists: prevent uncoordinated browser/runtime reuse across concurrent suite execution
- Entry points:
  - `scripts/testing/lib/runtime-broker.mjs`
  - `scripts/testing/run-playwright-suite.mjs`

### Base import run execution

- Resource id: `integrations.base-import.run`
- Mode: `exclusive`
- Why it exists: preserve one active writer for import retries, sequencing, and side effects
- Entry point:
  - `src/features/integrations/services/imports/base-import-service.ts`

## Recommended lease fields

Lease-aware services should capture at least:

- `resourceType`
- `resourceId`
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
3. Heartbeat while work is active.
4. Release ownership explicitly when possible.
5. Recover stale ownership only through the documented recovery path.

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
