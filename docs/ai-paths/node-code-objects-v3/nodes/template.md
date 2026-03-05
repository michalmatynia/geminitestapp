# Template Migration Sheet (`template`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.template.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Config field count: 4

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/template.json`
- Semantic hash: `349143bb99ff84ec6f3ceba1c8d8a24e48682e23c0679ef6bc8ff3048636640c`
- v2 code object: `docs/ai-paths/node-code-objects-v2/template.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/template.scaffold.json`
- v3 object id: `node_obj_template_portable_v3`
- v3 object hash: `818d7ec5fca3d3ae120198a3418831ed55f1d54d0f7aafce0ff969a6408d02bf`

## Ports

Inputs:
- `bundle`
- `value`
- `productId`

Outputs:
- `prompt`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

