---
owner: 'AI Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'feature-guide'
scope: 'ai-features'
canonical: true
---

# Agent Runtime Overview

In this repo, “Agent Runtime” refers to the server-side execution layer under `src/features/ai/agent-runtime`. It is the lower-level engine used by agent-style features, while most operator-facing runtime controls live in AI Paths and Agent Creator.

Use [`../ai-paths/overview.md`](../ai-paths/overview.md) and [`../ai-paths/reference.md`](../ai-paths/reference.md) for the broader queueing, resume, handoff, and run-inspection surfaces.

## Current code map

The runtime is split into concrete areas:

- `core/`: engine entrypoints and config
- `planning/`: LLM planning, post-processing, critique, and summarization helpers
- `execution/`: plan execution, step runner, loop guard, checkpoint logic, approval logic, and finalization
- `tools/`: Playwright, search, segments, LLM, and shared tool utilities
- `memory/`: checkpoint and runtime memory helpers
- `audit/`: gate logic, approvals, audit-server helpers
- `workers/`: queued processor and runtime queue wiring
- `context-registry/`: workspace bundles shared into admin/operator surfaces

## What the runtime owns

The runtime layer is responsible for:

- generating or refining executable step plans
- running step loops against the available tool families
- checkpointing active state between steps
- surfacing approval-required actions
- applying loop-guard and recovery logic
- finalizing runs into summaries, logs, and persisted state

It is not the sole documentation home for every workflow that uses it. AI Paths, Chatbot agent-assist flows, and Agent Creator run monitoring all sit above this layer.

## Contract highlights from the shared runtime DTOs

The current shared contract lives in [`src/shared/contracts/agent-runtime.ts`](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/src/shared/contracts/agent-runtime.ts).

Notable verified enums and records:

- decision actions: `respond`, `tool`, `wait_human`
- plan step statuses: `pending`, `running`, `completed`, `failed`
- plan step phases: `observe`, `act`, `verify`, `recover`
- approval statuses: `pending`, `approved`, `rejected`
- checkpoints tracking:
  - `activeStepId`
  - `resumeRequestedAt`
  - `resumeProcessedAt`
  - `approvalRequestedStepId`
  - `approvalGrantedStepId`
  - `checkpointBrief`
  - `checkpointNextActions`
  - `checkpointRisks`

Those are the current repo-level truth, and they matter more than older illustrative status diagrams.

## Tool families currently wired here

The runtime’s concrete tool families are visible in `src/features/ai/agent-runtime/tools/`:

- Playwright/browser automation
- search
- segments / extraction helpers
- LLM-backed tool helpers
- shared tool typing and execution utilities

This is a narrower and more concrete statement than claiming a generic arbitrary “communication/email/database” tool catalog.

## Operator-facing surfaces that depend on this layer

- `/admin/ai-paths`
- `/admin/agentcreator/runs`
- chatbot agent-assist routes under `/api/chatbot/agent/*`
- agentcreator runtime routes under `/api/agentcreator/agent/*`
- AI Paths runtime routes under `/api/ai-paths/*`

## Related docs

- [`./agent-runtime-execution-flow.md`](./agent-runtime-execution-flow.md)
- [`../ai-paths/overview.md`](../ai-paths/overview.md)
- [`../ai-paths/reference.md`](../ai-paths/reference.md)
- [`./agent-creator-overview.md`](./agent-creator-overview.md)
