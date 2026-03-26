---
owner: 'AI Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'technical-guide'
scope: 'ai-features'
canonical: true
---

# Agent Runtime Execution Flow

This guide describes the actual runtime pipeline implemented under `src/features/ai/agent-runtime`, without inventing extra statuses or storage layers.

## 1. Entry points

A run enters the runtime from higher-level feature surfaces such as:

- AI Paths APIs under `/api/ai-paths/*`
- Agent Creator runtime routes under `/api/agentcreator/agent/*`
- Chatbot agent-assist routes under `/api/chatbot/agent/*`

Those features decide when to enqueue, resume, hand off, or inspect runs. The runtime layer then owns plan execution itself.

## 2. Planning

Planning code lives under:

- `src/features/ai/agent-runtime/execution/plan.ts`
- `src/features/ai/agent-runtime/planning/`

Key responsibilities:

- turning the incoming task into step sequences
- enriching the plan with critique, alternatives, or summaries where needed
- producing plan steps that align with the current shared contract:
  - statuses: `pending`, `running`, `completed`, `failed`
  - phases: `observe`, `act`, `verify`, `recover`

## 3. Step execution

The core execution lane lives under:

- `src/features/ai/agent-runtime/execution/step-runner.ts`
- `src/features/ai/agent-runtime/execution/step-runner/`

That layer handles:

- tool dispatch
- post-step review
- approval checks
- checkpoint updates
- step-level recovery decisions

The step-runner helpers are already split by concern:

- `tool-logic.ts`
- `checkpoint-logic.ts`
- `approval-logic.ts`

## 4. Tool invocation

Runtime tools are wired through `src/features/ai/agent-runtime/tools/`.

Concrete families in this repo:

- Playwright
- search
- segments/extraction
- LLM-backed helpers

This is where runtime execution meets browser automation, extraction, and supporting model calls.

## 5. Loop guard and recovery

The runtime does not rely on a vague “agent keeps trying forever” model. It has explicit loop and recovery helpers:

- `src/features/ai/agent-runtime/execution/loop-guard.ts`
- `src/features/ai/agent-runtime/execution/step-runner-post-step-reviews.ts`

These layers evaluate whether the current step should:

- continue
- recover
- checkpoint for later resume
- request human approval / intervention

## 6. Checkpoints and memory

Checkpoint and runtime-memory helpers live under:

- `src/features/ai/agent-runtime/memory/checkpoint.ts`
- `src/features/ai/agent-runtime/memory/context.ts`
- `src/features/ai/agent-runtime/memory/index.ts`

The current checkpoint contract includes:

- `activeStepId`
- `lastError`
- `resumeRequestedAt`
- `resumeProcessedAt`
- `approvalRequestedStepId`
- `approvalGrantedStepId`
- `checkpointBrief`
- `checkpointNextActions`
- `checkpointRisks`

That is the maintained runtime resume model in this repo.

## 7. Audit and approvals

Audit and approval behavior lives under:

- `src/features/ai/agent-runtime/audit/`

Relevant pieces:

- approval records
- gate logic
- audit server helpers

The shared contract uses approval statuses:

- `pending`
- `approved`
- `rejected`

If you need the broader operator story for resume, handoff, or lease contention, use the AI Paths docs rather than expanding this page into queue-policy documentation.

## 8. Finalization and worker execution

Run finalization and queued execution are split into:

- `src/features/ai/agent-runtime/execution/finalize.ts`
- `src/features/ai/agent-runtime/workers/agent-processor.ts`
- `src/features/ai/agent-runtime/workers/agentQueue.ts`

That is where the runtime moves from active step execution into persisted completion, failure, or later inspection.

## 9. Practical documentation boundary

Use this document for:

- engine ownership
- code-path orientation
- shared execution concepts

Use AI Paths docs for:

- queueing policy
- run resume and handoff APIs
- operator dashboards
- trigger-button integration
- runtime analytics surfaces

## Related docs

- [`./agent-runtime-overview.md`](./agent-runtime-overview.md)
- [`../ai-paths/overview.md`](../ai-paths/overview.md)
- [`../ai-paths/reference.md`](../ai-paths/reference.md)
