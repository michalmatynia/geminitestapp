---
owner: 'AI Paths Team'
last_reviewed: '2026-04-05'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Context Filter Migration Sheet (`context`)

Generated at: 2026-04-05T14:57:57.569Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.context.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 11

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/context.json`
- Semantic hash: `8fec17546b68d240c422c0ddbc259a485825d96df3725bec228aacf3cdf84c16`
- v2 code object: `docs/ai-paths/node-code-objects-v2/context.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/context.scaffold.json`
- v3 object id: `node_obj_context_portable_v3`
- v3 object hash: `7ead38ff035ccf97c57707343800e1ddb0784c2b60c5d7c3dd19fd918f3760de`

## Ports

Inputs:
- `context`

Outputs:
- `context`
- `entityId`
- `entityType`
- `entityJson`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

