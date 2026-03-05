# Mutator Migration Sheet (`mutator`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.mutator.v3`
- Readiness stage: `pilot_indexed`
- Readiness score: 80/100
- Readiness blockers: `parity_not_validated`
- Config field count: 5

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/mutator.json`
- Semantic hash: `86dc18244f712290a2815cef8e22145b0cd058095cfd729b300b030b4eacfb4b`
- v2 code object: `docs/ai-paths/node-code-objects-v2/mutator.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/mutator.scaffold.json`
- v3 object id: `node_obj_mutator_portable_v3`
- v3 object hash: `dcf613da31f587da3f31f4215765bec00e72357a1a32aad9759d0c683626fc1d`

## Ports

Inputs:
- `context`

Outputs:
- `context`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

