# AI Description Generator Migration Sheet (`ai_description`)

Generated at: 2026-03-06T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.ai_description.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 5

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/ai_description.json`
- Semantic hash: `93b3b2422e407af85154a56198326729fba9e936f87882491f1d311ea46967e7`
- v2 code object: `docs/ai-paths/node-code-objects-v2/ai_description.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/ai_description.scaffold.json`
- v3 object id: `node_obj_ai_description_portable_v3`
- v3 object hash: `2d0c32b67d2dda1e1a9fa942bf88cf5b1c693d373b9023abad73dafdc441e52e`

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
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

