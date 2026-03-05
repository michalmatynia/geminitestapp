# Model Migration Sheet (`model`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.model.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `no` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 9

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/model.json`
- Semantic hash: `69429171748383402c62fb8f86ce6e354e76e13ed83ad5302d8b266b2cced9d5`
- v2 code object: `docs/ai-paths/node-code-objects-v2/model.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/model.scaffold.json`
- v3 object id: `node_obj_model_portable_v3`
- v3 object hash: `4dad6cd6dc5826ea8b9af205b8c52264da0e6d56da5471632967a10e1f9a0158`

## Ports

Inputs:
- `prompt`
- `images`

Outputs:
- `result`
- `jobId`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

