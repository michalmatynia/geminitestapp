# AI Paths Documentation

Extended reference: `docs/AI_PATHS_EXTENDED_REFERENCE.md`

## What AI Paths Are

AI Paths are the application’s graph-based workflow runtime for AI, automation,
data transformation, and side-effect orchestration.

They support:

- node-based workflow authoring in the admin UI
- runtime validation and graph compilation
- queued or inline execution depending on Redis availability and runtime policy
- per-run observability, timeline, and event inspection
- integration with Trigger Buttons, product flows, and other admin workflows

## Current Code Map

AI Paths are split across four major areas:

### Shared core runtime

- `src/shared/lib/ai-paths/core/`
- definitions, semantic grammar, validation engine, runtime engine, security,
  and Playwright support live here

### Feature UI and orchestration

- `src/features/ai/ai-paths/`
- admin pages, canvas/editor UI, runtime panels, repositories, and services

### API surface

- `src/app/api/ai-paths/`
- enqueue, runs, validation, settings, trigger buttons, health, runtime
  analytics, Playwright, and related endpoints

### Queue and worker

- `src/features/ai/ai-paths/workers/aiPathRunQueue.ts`
- startup wiring happens via `src/features/jobs/queue-init.ts`

## Core Concepts

- **Path**: a directed graph of nodes and edges
- **Node**: a typed execution unit with config, inputs, and outputs
- **Ports**: typed connection points between nodes
- **Context**: mutable run state shared across node execution
- **Run**: one execution instance of a path
- **Trigger**: the event or UI action that starts a run

## Runtime Model

At runtime AI Paths use:

- compile/validation passes before execution
- typed or convention-based input/output ports
- run records and node event records
- queue-aware orchestration with cancellation/retry handling
- runtime analytics and observability hooks

The exact graph contract is documented in the semantic grammar docs under
`docs/ai-paths/semantic-grammar/`.

## Node Families

AI Paths currently cover node families such as:

- input and scoping nodes
- transformation and routing nodes
- model/prompt/agent nodes
- HTTP and external call nodes
- database and schema nodes
- viewer/notification/diagnostic nodes
- Playwright/browser automation nodes

For canonical node documentation, use:

- `docs/ai-paths/semantic-grammar/nodes/`
- `docs/ai-paths/tooltip-catalog.json`
- `src/shared/lib/ai-paths/core/docs/node-docs.ts`

## Trigger Buttons

Trigger Buttons are configurable UI entrypoints that start AI Paths from admin
screens. They are managed through the AI Paths admin area and API endpoints
under `src/app/api/ai-paths/trigger-buttons/`.

Typical trigger context includes entity identifiers such as product, note, or
other record scope depending on where the button is mounted.

## Runtime Guarantees and Constraints

- validation and graph safety checks run before risky execution paths
- queued execution is preferred when Redis is available
- some flows can fall back to inline execution when Redis is absent
- observability and run inspection are first-class parts of the system
- security-sensitive nodes rely on central policy helpers such as outbound URL
  restrictions and provider gating

## Playwright Node

AI Paths includes a programmable Playwright node for browser automation.

Primary references:

- `docs/ai-paths/playwright-node.md`
- `src/shared/lib/ai-paths/core/playwright/`
- `src/app/api/ai-paths/playwright/`

## Documentation and Generation

The AI Paths docs set mixes hand-written and generated artifacts.

Useful commands:

```bash
npm run docs:ai-paths:semantic:generate
npm run docs:ai-paths:semantic:check
npm run docs:ai-paths:tooltip:generate
npm run docs:ai-paths:tooltip:check
```

## Cross References

- `docs/AI_PATHS_EXTENDED_REFERENCE.md`
- `docs/ai-paths/semantic-grammar/README.md`
- `docs/ai-paths/playwright-node.md`
- `docs/ARCHITECTURE_GUARDRAILS.md`
