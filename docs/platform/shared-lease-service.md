---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'reference'
scope: 'platform'
canonical: true
---

# Shared Lease Service

The shared lease service is the reusable ownership API for concurrent agent work in this repository.

It gives agents a common way to:

- inspect lease-aware resources
- claim ownership
- renew ownership
- release ownership
- inspect recent lease events

## Endpoints

### `GET /api/agent/leases`

Returns the current lease state for lease-aware resources.

Supported query parameters:

- `resourceId`
- `scopeId`
- `activeOnly=true`
- `resourceType`

Examples:

- `/api/agent/leases`
- `/api/agent/leases?activeOnly=true`
- `/api/agent/leases?resourceType=job`
- `/api/agent/leases?resourceId=integrations.base-import.run&scopeId=run-42`
- `/api/agent/leases?resourceId=testing.playwright.runtime-broker&scopeId=web-dev-agent-a-1234`

### `POST /api/agent/leases`

Mutates lease state.

Supported actions:

- `claim`
- `renew`
- `release`

For partitioned resources, include `scopeId`.

Example bodies:

```json
{
  "action": "claim",
  "resourceId": "integrations.base-import.run",
  "scopeId": "run-42",
  "ownerAgentId": "codex-agent-1",
  "ownerRunId": "run-42"
}
```

```json
{
  "action": "renew",
  "resourceId": "integrations.base-import.run",
  "scopeId": "run-42",
  "ownerAgentId": "codex-agent-1",
  "ownerRunId": "run-42",
  "leaseId": "lease-uuid"
}
```

```json
{
  "action": "release",
  "resourceId": "integrations.base-import.run",
  "scopeId": "run-42",
  "ownerAgentId": "codex-agent-1",
  "leaseId": "lease-uuid",
  "reason": "run finished"
}
```

## Current integration state

### Base import runs

- managed directly by the shared lease service
- mirrored back into persisted run lock fields
- scoped by `runId`

### Playwright runtime broker

- discovered through the shared lease API from the broker's real lease files
- scoped by broker `leaseKey`
- still acquired and released through `runtime-broker.mjs`

This is intentional for the current stage. It gives agents a single discovery and ownership contract now, while preserving the existing broker startup path.

## Usage rules

1. Discover the resource through `/api/agent/resources` or `/api/agent/capabilities`.
2. Provide `scopeId` when the resource descriptor requires it.
3. Claim the lease before mutation if the resource requires one.
4. Renew the lease while long-running work is active.
5. Release the lease when the run is complete.
6. Do not force ownership takeover without an approval-backed recovery path.

## Relationship to the manifest

The capability manifest tells an agent which resources require leases and whether they require `scopeId`.
The shared lease service is the live ownership surface for those resources.

## AI Paths integration

The shared lease service now backs AI Paths execution ownership for the partitioned `ai-paths.run.execution` resource. Each run claims its own scope using the run id, which lets agents inspect live ownership with `/api/agent/leases` without reverse-engineering queue state.
