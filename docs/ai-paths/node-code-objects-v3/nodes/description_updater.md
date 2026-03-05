# Description Updater (Deprecated) Migration Sheet (`description_updater`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.description_updater.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Config field count: 3

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/description_updater.json`
- Semantic hash: `0140c1929e747f53a5f4f60043595787d367bdd869350012552e7cc185c69588`
- v2 code object: `docs/ai-paths/node-code-objects-v2/description_updater.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/description_updater.scaffold.json`
- v3 object id: `node_obj_description_updater_portable_v3`
- v3 object hash: `036b75287b8b567ce566c659ad29e542decd3fdf4efcd3015c7a933e488dc346`

## Ports

Inputs:
- `productId`
- `description_en`

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

