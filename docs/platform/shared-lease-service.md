# Shared Lease Service

The shared lease service is the first reusable ownership API for concurrent agent work in this repository.

It gives agents a common way to:

- inspect lease-aware resources
- claim ownership
- renew ownership
- release ownership
- inspect recent lease events

## Endpoints

### `GET /api/agent/leases`

Returns the current lease state for all lease-aware resources.

Supported query parameters:

- `activeOnly=true`: return only resources with an active lease
- `resourceType`: filter by resource type

Examples:

- `/api/agent/leases`
- `/api/agent/leases?activeOnly=true`
- `/api/agent/leases?resourceType=runtime`

### `GET /api/agent/leases?resourceId=...`

Returns the current lease state for one resource.

Example:

- `/api/agent/leases?resourceId=testing.playwright.runtime-broker`

### `POST /api/agent/leases`

Mutates lease state.

Supported actions:

- `claim`
- `renew`
- `release`

Example bodies:

```json
{
  "action": "claim",
  "resourceId": "testing.playwright.runtime-broker",
  "ownerAgentId": "codex-agent-1",
  "ownerRunId": "run-42"
}
```

```json
{
  "action": "renew",
  "resourceId": "testing.playwright.runtime-broker",
  "ownerAgentId": "codex-agent-1",
  "ownerRunId": "run-42",
  "leaseId": "lease-uuid"
}
```

```json
{
  "action": "release",
  "resourceId": "testing.playwright.runtime-broker",
  "ownerAgentId": "codex-agent-1",
  "leaseId": "lease-uuid",
  "reason": "suite finished"
}
```

## Current limitation

This service is currently process-local. That means:

- it provides a real shared contract and route shape
- it does not yet control the existing Playwright broker or base import lease paths
- ownership disappears when the process restarts

This is intentional for the current stage. The next migration step is to move the existing runtime broker and import run ownership logic onto this service instead of keeping them feature-local.

## Usage rules

1. Discover the resource through `/api/agent/resources` or `/api/agent/capabilities`.
2. Claim the lease before mutation if the resource requires one.
3. Renew the lease while long-running work is active.
4. Release the lease when the run is complete.
5. Do not force ownership takeover without an approval-backed recovery path.

## Relationship to the manifest

The capability manifest tells an agent which resources require leases.
The shared lease service is the live ownership surface for those resources.
