# Simulation: Entity Modal Migration Sheet (`simulation`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.simulation.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 7

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/simulation.json`
- Semantic hash: `cce9b04665f1d723b51d00c2139a75d1225cee9488574ab03d39fb68537dbcb7`
- v2 code object: `docs/ai-paths/node-code-objects-v2/simulation.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/simulation.scaffold.json`
- v3 object id: `node_obj_simulation_portable_v3`
- v3 object hash: `2e7504c02f6d65866b23cf869eb33e55a52fd9f9319c08bcc07c2b7b6a5ce435`

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
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

