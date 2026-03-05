# AI Description Generator Migration Sheet (`ai_description`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.ai_description.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `no` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 5

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/ai_description.json`
- Semantic hash: `93b3b2422e407af85154a56198326729fba9e936f87882491f1d311ea46967e7`
- v2 code object: `docs/ai-paths/node-code-objects-v2/ai_description.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/ai_description.scaffold.json`
- v3 object id: `node_obj_ai_description_portable_v3`
- v3 object hash: `061517ae24c85f7985d79ed4f5fb8615e57cbfcfffbb05bcc22d3781898daf0d`

## Ports

Inputs:
- `entityJson`
- `images`
- `title`

Outputs:
- `description_en`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

