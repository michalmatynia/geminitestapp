---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'overview'
scope: 'platform'
canonical: true
---

# Agentic Coding Overview

This application now exposes a first-class baseline for AI-first concurrent agentic coding:

- machine-readable capability discovery at `/api/agent/capabilities`
- resource and approval discovery at `/api/agent/resources` and `/api/agent/approval-gates`
- explicit lease-aware shared resources
- forward-only execution guidance for concurrent writers
- approval-gated access for destructive, secret-bearing, and production-impacting actions

All of these discovery endpoints are authenticated Next.js API surfaces. Treat them as repo-internal operator and agent contracts, not public anonymous APIs.

## Operating model

Agents should follow this sequence:

1. Discover available capabilities from `/api/agent/capabilities`.
2. Narrow the target resource or approval contract through `/api/agent/resources` or `/api/agent/approval-gates`.
3. Choose the narrowest capability that satisfies the task.
4. Acquire or respect a lease before mutating a shared runtime, job, or other exclusive resource.
5. Persist append-only events and resumable checkpoints at each durable boundary.
6. Hand off or block when ownership cannot be acquired cleanly.
7. Request approval before destructive, secret, or production-impacting work.

## Current platform surfaces

### Playwright runtime broker

- Scope: reusable browser/runtime instances for coordinated Playwright execution
- Current state: available
- Ownership model: exclusive lease
- Primary entrypoints:
  - `scripts/testing/lib/runtime-broker.mjs`
  - `scripts/testing/run-playwright-suite.mjs`

### Base import run leasing

- Scope: import execution, retry ownership, and side-effect sequencing
- Current state: available
- Ownership model: exclusive lease
- Primary entrypoint:
  - `src/features/integrations/services/imports/base-import-service.ts`

### AI Paths run orchestration

- Scope: queueing, runtime contracts, run events, checkpoints, and approval-linked execution
- Current state: partial
- Ownership model: append-only workflow surface plus partitioned `ai-paths.run.execution` leases for active queue workers
- Primary entrypoints:
  - `src/features/ai/ai-paths/workers/ai-path-run-queue/queue.ts`
  - `src/shared/contracts/ai-paths.ts`
  - `src/shared/contracts/agent-runtime.ts`

## Concurrency rules

- One writer per exclusive resource.
- Shared reads are allowed only when the resource contract says so.
- Append-only workflow state is preferred over mutable singleton state.
- If a resource is blocked, do not race another agent. Wait, queue, or hand off.
- Destructive ownership takeover requires approval.

## Forward-only coding rules

- Prefer additive edits over destructive rewrites.
- Persist what happened as events or checkpoints instead of overwriting history.
- Treat handoff as a supported outcome, not a failure case.
- Keep approvals attached to run boundaries so another agent can reconstruct why access was granted.

## Discovery contract

The canonical machine-readable discovery surface is:

- `GET /api/agent/capabilities`

Related authenticated discovery surfaces:

- `GET /api/agent/resources`
- `GET /api/agent/approval-gates`
- `GET /api/agent/leases`

The manifest describes:

- available capabilities
- required or recommended lease behavior
- approval gates
- resource ownership expectations
- recommended execution workflow

## Documentation map

- `docs/platform/resource-leasing.md`
- `docs/platform/shared-lease-service.md`
- `docs/platform/agent-discovery.md`
- `docs/platform/forward-only-execution.md`
