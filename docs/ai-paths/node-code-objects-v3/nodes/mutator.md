# Mutator Migration Sheet (`mutator`)

Generated at: 2026-03-06T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.mutator.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 5

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/mutator.json`
- Semantic hash: `86dc18244f712290a2815cef8e22145b0cd058095cfd729b300b030b4eacfb4b`
- v2 code object: `docs/ai-paths/node-code-objects-v2/mutator.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/mutator.scaffold.json`
- v3 object id: `node_obj_mutator_portable_v3`
- v3 object hash: `d494689f686d7c140e861deaab2bf4ef5d19baf237c3b98f52939ba74323065b`

## Ports

Inputs:
- `context`

Outputs:
- `context`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

