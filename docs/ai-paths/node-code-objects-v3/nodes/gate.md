---
owner: 'AI Paths Team'
last_reviewed: '2026-03-05'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Gate Migration Sheet (`gate`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.gate.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 5

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/gate.json`
- Semantic hash: `c49aeec3b3e821c7acbe9f9602a3ab9d27933ddede848c552a4e728011e39425`
- v2 code object: `docs/ai-paths/node-code-objects-v2/gate.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/gate.scaffold.json`
- v3 object id: `node_obj_gate_portable_v3`
- v3 object hash: `b97f1b9584a7dda0fc135a6bf3fcfed1149d7851833cffdc2c49f099d3f7d73f`

## Ports

Inputs:
- `context`
- `valid`
- `errors`

Outputs:
- `context`
- `valid`
- `errors`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

