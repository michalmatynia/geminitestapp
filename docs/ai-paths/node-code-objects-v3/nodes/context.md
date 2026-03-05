# Context Filter Migration Sheet (`context`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.context.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Config field count: 11

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/context.json`
- Semantic hash: `8fec17546b68d240c422c0ddbc259a485825d96df3725bec228aacf3cdf84c16`
- v2 code object: `docs/ai-paths/node-code-objects-v2/context.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/context.scaffold.json`
- v3 object id: `node_obj_context_portable_v3`
- v3 object hash: `c227b30bb2d8955dc3d44284afadfd04eb50b2b7a31a844225e82805285183d5`

## Ports

Inputs:
- `context`

Outputs:
- `context`
- `entityId`
- `entityType`
- `entityJson`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

