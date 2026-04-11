---
owner: 'AI Paths Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Trigger: Image Studio Analysis Migration Sheet (`trigger`)

Generated at: 2026-04-11T13:54:16.572Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.trigger.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`, `runtime-kernel-product-trigger-queue-e2e`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 5

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/trigger.json`
- Semantic hash: `fb32646a0464e68e236519ec6ceab11b53fe46ae97158cbf699fa515725209cd`
- v2 code object: `docs/ai-paths/node-code-objects-v2/trigger.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/trigger.scaffold.json`
- v3 object id: `node_obj_trigger_portable_v3`
- v3 object hash: `d3646a3e751b8f5ddfd36b9ae26d5e273cca6aca5fba1e56727db58aba1b73d8`

## Ports

Inputs:
- (none)

Outputs:
- `trigger`
- `triggerName`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

