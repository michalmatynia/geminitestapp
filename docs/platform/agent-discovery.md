---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'reference'
scope: 'platform'
canonical: true
---

# Agent Discovery

Agents should discover platform capabilities from HTTP endpoints before selecting a tool path or mutating a shared resource.

All of the endpoints below are authenticated repo-internal APIs. They are intended for operator tooling, runtime workers, and agent surfaces that already have platform access.

## Endpoints

### `GET /api/agent/capabilities`

Returns the full machine-readable manifest, including:

- execution model
- resources
- approval gates
- capabilities
- recommended workflow

Use this endpoint when the agent needs the complete discovery surface.

### `GET /api/agent/resources`

Returns resource descriptors and the current forward-only execution guidance.

Supported query parameters:

- `resourceId`: return one resource and the capabilities that depend on it
- `mode`: filter by lease mode
- `requiresLease=true|false`: filter by lease requirement
- `resourceType`: filter by resource type

Examples:

- `/api/agent/resources`
- `/api/agent/resources?requiresLease=true`
- `/api/agent/resources?mode=partitioned`
- `/api/agent/resources?resourceId=testing.playwright.runtime-broker`

Single-resource responses also include the capabilities that depend on that resource plus the shared execution summary.

### `GET /api/agent/approval-gates`

Returns approval gate descriptors and the shared execution guidance.

Supported query parameters:

- `gateId`: return one approval gate
- `requiredFor`: filter by required action text

Examples:

- `/api/agent/approval-gates`
- `/api/agent/approval-gates?gateId=destructive-mutation`
- `/api/agent/approval-gates?requiredFor=production`

Single-gate responses also include the shared execution summary used by the other discovery endpoints.

### `GET /api/agent/leases`

Returns live lease state for lease-aware resources exposed by the shared lease service.

Supported query parameters:

- `resourceId`
- `scopeId`
- `activeOnly=true`
- `resourceType`

Use `scopeId` for partitioned resources such as:

- Playwright broker `leaseKey`
- base import `runId`
- AI Paths `runId`

Examples:

- `/api/agent/leases`
- `/api/agent/leases?resourceId=testing.playwright.runtime-broker`
- `/api/agent/leases?resourceId=testing.playwright.runtime-broker&scopeId=web-dev-agent-a-1234`
- `/api/agent/leases?resourceId=integrations.base-import.run&scopeId=run-123`
- `/api/agent/leases?resourceId=ai-paths.run.execution&scopeId=run-123`

## Usage guidance

1. Call `/api/agent/capabilities` first if the task is broad or the agent has not seen this repository before.
2. Call `/api/agent/resources` before selecting a runtime, broker, or exclusive mutation path.
3. Call `/api/agent/approval-gates` before secret-bearing, destructive, or production-impacting work.
4. Call `/api/agent/leases` before assuming ownership of a lease-aware resource.
5. If a resource descriptor says `scopeRequired`, do not omit `scopeId`.

## Current limitation

The lease API is mixed-mode today:

- base import run scopes are mutated directly through the shared lease service
- AI Paths execution scopes are mutated directly through the shared lease service
- Playwright runtime broker scopes are discovered from the broker's real lease files
- Playwright lease mutation still flows through `runtime-broker.mjs`, not through `POST /api/agent/leases`

## Discovering AI Paths execution ownership

Agents can inspect current AI Paths execution ownership through the lease discovery surface:

- `GET /api/agent/leases?resourceId=ai-paths.run.execution`
- `GET /api/agent/leases?resourceId=ai-paths.run.execution&scopeId=<runId>`

A `blocked_on_lease` run indicates that another worker or agent still owns the execution scope. A `handoff_ready` run indicates that execution context has been preserved in run metadata and is ready for another agent to continue.

Operator-facing UI surfaces also expose this state directly:

- the run history list can mark blocked runs handoff-ready
- the run detail dialog can mark blocked runs handoff-ready and shows current owner context
- queue cards and the canvas sidebar show lease-blocked and handoff-ready guidance
