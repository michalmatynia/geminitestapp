# Agent Discovery

Agents should discover platform capabilities from HTTP endpoints before selecting a tool path or mutating a shared resource.

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
- `/api/agent/resources?mode=exclusive`
- `/api/agent/resources?resourceId=testing.playwright.runtime-broker`

### `GET /api/agent/approval-gates`

Returns approval gate descriptors and the shared execution guidance.

Supported query parameters:

- `gateId`: return one approval gate
- `requiredFor`: filter by required action text

Examples:

- `/api/agent/approval-gates`
- `/api/agent/approval-gates?gateId=destructive-mutation`
- `/api/agent/approval-gates?requiredFor=production`

### `GET /api/agent/leases`

Returns live lease state for lease-aware resources exposed by the shared lease service.

Supported query parameters:

- `resourceId`
- `activeOnly=true`
- `resourceType`

Use this endpoint when the agent needs current ownership state instead of static capability metadata.

## Usage guidance

1. Call `/api/agent/capabilities` first if the task is broad or the agent has not seen this repository before.
2. Call `/api/agent/resources` before selecting a runtime, broker, or exclusive mutation path.
3. Call `/api/agent/approval-gates` before secret-bearing, destructive, or production-impacting work.
4. Call `/api/agent/leases` before assuming ownership of a lease-aware resource.
5. If a resource requires a lease, do not assume implicit ownership.

## Current limitation

The lease service currently keeps ownership state in-process. It exposes a real API contract, but it does not yet drive the existing Playwright broker and base import ownership paths. That migration is the next integration step.
