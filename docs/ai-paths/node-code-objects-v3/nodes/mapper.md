# JSON Mapper Migration Sheet (`mapper`)

Generated at: 2026-03-06T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.mapper.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 6

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/mapper.json`
- Semantic hash: `4fe386d977d549e3093ddd028db6ed2da07b6962e3f6c7f0f3e980e8a07ceba1`
- v2 code object: `docs/ai-paths/node-code-objects-v2/mapper.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/mapper.scaffold.json`
- v3 object id: `node_obj_mapper_portable_v3`
- v3 object hash: `66263e28955a1dc1ae6ed3f34c2f58e7f7508392314cc01eafdaa9fd3cfe48d7`

## Ports

Inputs:
- `context`
- `result`
- `bundle`
- `value`

Outputs:
- `value`
- `result`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

