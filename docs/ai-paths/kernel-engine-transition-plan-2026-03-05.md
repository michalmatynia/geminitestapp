---
owner: 'AI Paths Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'plan'
scope: 'feature:ai-paths'
canonical: true
---

# AI-Paths Kernel Engine Transition Plan (2026-03-05)

This is the retained transition plan for the kernel-engine migration wave. Current
runtime state and operator entrypoints are documented in [`overview.md`](./overview.md),
[`reference.md`](./reference.md), and the AI Paths runtime/reference docs they link to.

## Goal

Migrate AI-Paths from workflow-coupled runtime behavior to a semantic, portable, and page-independent Kernel Engine without feature loss.

## Operating constraints

1. No hardcoded workflow-specific behavior in runtime decisions.
2. Node parsing and validation behavior remains declarative through UI-managed pattern lists.
3. Portable path code remains the canonical cross-page transfer unit.
4. Existing pages keep steady behavior while migration runs behind flags.

## Migration pillars

1. Contract-first parity.
Use a feature parity matrix and explicit acceptance gates for runtime execution, run history, validation, queueing, import/export, and observability.

2. Portable schema stability.
Use `ai-paths.portable-engine.v2` as canonical path transport and enforce deterministic serialize/deserialize checks.

3. Adapter boundary.
Page integrations call kernel-compatible execution adapters instead of direct workflow-coupled internals.

4. Dual-run rollout.
Use shadow execution and diff telemetry before promoting kernel execution to primary mode.

5. Safety and reversibility.
Keep kill switches and fallback paths until parity and reliability gates are met.

## Transition phases

1. Baseline Contract and Inventory
Freeze feature inventory, define parity acceptance, and maintain machine-readable readiness (`kernel-transition-readiness.json`).

2. Canonical Schema and Parser Patterns
Complete migration to semantic portable schema + UI-defined validation/parser pattern lists; remove workflow assumptions from parser behavior.

3. Kernel Runtime Parity
Run node execution, runtime validation middleware, and event tracing with parity tests between legacy adapter and kernel strategy.

4. Integration Stabilization
Wire page runtime loops, server execution, and queue execution through kernel-compatible adapter surfaces; preserve UX and run history semantics.

5. Progressive Rollout
Run internal -> runtime-kernel pages -> partial traffic -> full rollout with explicit kill switches and SLO monitoring.

6. Legacy Prune
Remove legacy workflow-coupled execution paths only after sustained parity and rollback confidence.

## Required gates

1. Feature parity matrix:
No critical feature can move to rollout wave 2+ without `parity_verified` status and evidence links.

2. Runtime safety:
No regression in run status distribution (`completed`, `failed`, `blocked`, `canceled`) and run history consistency.

3. Validation consistency:
Stage-based validation decisions (`graph_parse`, `graph_bind`, `node_pre_execute`, `node_post_execute`) must be stable across client/server portable runs.

4. Portability:
Cross-page import/export roundtrip of canonical path code must preserve behavior and validation outcomes.

5. Observability:
Runtime telemetry must preserve node-level diagnostics, validation findings, and rollout flag context.

## CI enforcement

The readiness contract is checked by:

1. `npm run docs:ai-paths:kernel-transition:check`
2. `npm run ai-paths:check:canonical`

This prevents silent drift between migration plan, artifacts, and executable checks.
