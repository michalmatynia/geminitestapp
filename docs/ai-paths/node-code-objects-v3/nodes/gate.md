# Gate Migration Sheet (`gate`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.gate.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Config field count: 5

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/gate.json`
- Semantic hash: `c49aeec3b3e821c7acbe9f9602a3ab9d27933ddede848c552a4e728011e39425`
- v2 code object: `docs/ai-paths/node-code-objects-v2/gate.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/gate.scaffold.json`
- v3 object id: `node_obj_gate_portable_v3`
- v3 object hash: `0b3b771d323546d821f16eab553099cbf76f81f8961ceda2fc0ee7b67a63e253`

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
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

