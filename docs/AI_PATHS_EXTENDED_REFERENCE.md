# AI Paths Extended Reference

## Purpose
This document is the detailed operator/developer reference for AI Paths:
- how paths are modeled
- how each node category behaves at runtime
- how to safely change, test, and roll out path updates
- how AI Paths documentation governance works

## Path Lifecycle
1. Author path graph in Admin UI.
2. Validate node inputs/outputs and edge connectivity.
3. Run local simulation or targeted trigger.
4. Inspect run timeline and node events.
5. Iterate prompts/config until quality targets pass.
6. Promote path to active trigger/button.
7. Observe success/error rates and runtime health.

## Runtime Model
- Execution unit: one path run per trigger event.
- Context: mutable payload shared across node execution.
- Ports: typed IO slots (for example `prompt`, `result`, `bundle`, `entityId`).
- Edges: directed value flow between ports.
- Runtime state:
  - run metadata
  - node input snapshots
  - node outputs
  - per-node errors, retries, and timing

## Node Categories
### Input and Scoping
- `trigger`
- `context`
- `simulation`
- `parser`

### Transformation and Routing
- `template`
- `mapper`
- `mutator`
- `string_mutator`
- `compare`
- `gate`
- `router`
- `bundle`
- `iterator`
- `delay`
- `poll`

### AI and External Calls
- `prompt`
- `model`
- `agent`
- `learner_agent`
- `http`

### Persistence and Schema
- `database`
- `db_schema`
- `description_updater`
- `ai_description`

### Diagnostics and UX
- `viewer`
- `notification`

## Runtime Guardrails
- Validate required fields before side effects.
- Keep `database` writes gated behind quality checks for AI-generated text.
- Use explicit `idField`, `queryTemplate`, and `skipEmpty` safeguards.
- Keep model temperature low for deterministic classification/extraction tasks.
- Cap retries/loops to avoid runaway runs.
- Always expose observability payloads for drop/accept/write decisions.

## Prompt Design Standard
- Single responsibility per prompt node.
- Explicit output contract:
  - plain text or strict JSON schema
- Explicit claim-safety rules:
  - no unsupported facts
- Deterministic fallback behavior when confidence is low.
- Include source evidence block in prompt input whenever possible.

## Testing Standard
- Unit tests for handlers and helper transforms.
- Integration tests for full path behavior on representative entities.
- Regression matrix for known edge cases.
- Before rollout:
  - run with dry-run write mode where available
  - verify result shape and write payload
  - verify no silent success on empty/invalid prerequisites

## Rollout Standard
1. Clone current active path.
2. Apply changes in clone only.
3. Run A/B checks on representative entities.
4. Compare:
   - success rate
   - quality score
   - manual correction rate
   - latency
5. Gradual enablement by trigger scope/category.
6. Promote to default after stable monitoring window.

## Failure Playbook
1. Identify failing node from run timeline.
2. Validate node inputs and upstream edge payloads.
3. Check output parser assumptions (JSON shape, regex extraction).
4. Disable risky branch or revert path to last known-good version.
5. Re-run targeted test entities.
6. Document root cause and guardrail change.

## Documentation Governance
- Every path must have:
  - purpose and scope
  - input prerequisites
  - output contract
  - test matrix
  - rollout metrics
- Every new/changed control in related UI must include docs metadata.
- For Prompt Exploder docs-tooltips:
  - source of truth: `docs/prompt-exploder/tooltip-catalog.ts`
  - mapped at runtime by:
    - `src/features/prompt-exploder/docs/catalog.ts`
    - `src/features/prompt-exploder/docs/tooltip-registry.ts`

## Cross References
- `docs/AI_PATHS.md`
- `docs/PROMPT_EXPLODER_FEATURE_DOCUMENTATION.md`
- `docs/PROMPT_EXPLODER_TOOLTIP_GUIDE.md`
- `docs/PROMPT_EXPLODER_OPERATIONS_RUNBOOK.md`
