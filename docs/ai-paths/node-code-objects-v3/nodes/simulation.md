# Simulation: Entity Modal Migration Sheet (`simulation`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.simulation.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Config field count: 7

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/simulation.json`
- Semantic hash: `cce9b04665f1d723b51d00c2139a75d1225cee9488574ab03d39fb68537dbcb7`
- v2 code object: `docs/ai-paths/node-code-objects-v2/simulation.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/simulation.scaffold.json`
- v3 object id: `node_obj_simulation_portable_v3`
- v3 object hash: `260264a220a38e7a06ba60e09ea48e5cb1f24cf7a0410b703d144f10b8baf906`

## Ports

Inputs:
- `trigger`

Outputs:
- `context`
- `entityId`
- `entityType`
- `productId`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

