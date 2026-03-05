# Math Migration Sheet (`math`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.math.v3`
- Config field count: 5

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/math.json`
- Semantic hash: `d5cf086af1271545687273d8182e3ceb628aa14edb31fec62ff95b5fa970267d`
- v2 code object: `docs/ai-paths/node-code-objects-v2/math.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/math.scaffold.json`
- v3 object id: `node_obj_math_portable_v3`
- v3 object hash: `617cca2fcff9a80cf354ad125bcdb7efc3387fa9fb1e2dfb45b53cf5388ad1c2`

## Ports

Inputs:
- `value`

Outputs:
- `value`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

