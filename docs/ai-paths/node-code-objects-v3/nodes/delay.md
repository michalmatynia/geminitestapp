# Delay Migration Sheet (`delay`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.delay.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Config field count: 4

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/delay.json`
- Semantic hash: `fa631c84b720f9f975e8da3f24935e4d1b5d36ff103e58319691af9d07f5bd30`
- v2 code object: `docs/ai-paths/node-code-objects-v2/delay.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/delay.scaffold.json`
- v3 object id: `node_obj_delay_portable_v3`
- v3 object hash: `1f0b26b2c3deff73dbf90d4b173edb547e1821a940d48a5a477f8d23b6246711`

## Ports

Inputs:
- `value`
- `bundle`

Outputs:
- `value`
- `bundle`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

