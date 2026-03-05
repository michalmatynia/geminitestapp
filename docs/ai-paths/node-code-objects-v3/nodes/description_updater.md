# Description Updater (Deprecated) Migration Sheet (`description_updater`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `legacy_adapter`
- Migration wave: `backlog`
- Code object ID: `not_assigned`
- Readiness stage: `cataloged`
- Readiness score: 35/100
- Readiness blockers: `missing_v3_scaffold`, `not_in_v3_pilot`
- Parity evidence suite IDs: `none`
- Config field count: 3

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/description_updater.json`
- Semantic hash: `0140c1929e747f53a5f4f60043595787d367bdd869350012552e7cc185c69588`
- v2 code object: `docs/ai-paths/node-code-objects-v2/description_updater.json`
- v3 scaffold: `missing`
- v3 object id: `missing`
- v3 object hash: `missing`

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

