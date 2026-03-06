# Model Migration Sheet (`model`)

Generated at: 2026-03-06T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.model.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 9

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/model.json`
- Semantic hash: `69429171748383402c62fb8f86ce6e354e76e13ed83ad5302d8b266b2cced9d5`
- v2 code object: `docs/ai-paths/node-code-objects-v2/model.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/model.scaffold.json`
- v3 object id: `node_obj_model_portable_v3`
- v3 object hash: `a8e7ef678ccf03b077db4afa2f91d1fbd6913a9c3674d8fc485ee768db7bc552`

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
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

