# String Mutator Migration Sheet (`string_mutator`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.string_mutator.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Config field count: 10

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/string_mutator.json`
- Semantic hash: `b4a7a5bd6dafb681eedc8a64a18cf2d7be58116b1bbad6f4db32bc916703b899`
- v2 code object: `docs/ai-paths/node-code-objects-v2/string_mutator.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/string_mutator.scaffold.json`
- v3 object id: `node_obj_string_mutator_portable_v3`
- v3 object hash: `a95b3ffff43ce36ac013b72a1ca98a9e0ab14d1d94966633cb67ba87c9c82098`

## Ports

Inputs:
- `value`
- `prompt`
- `result`

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

