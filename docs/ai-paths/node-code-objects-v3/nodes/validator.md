# Validator Migration Sheet (`validator`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.validator.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `no` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 5

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/validator.json`
- Semantic hash: `626a3f87a56184a58e1c7c3f488383a855a2ce50a97bbcef42898d28788d8619`
- v2 code object: `docs/ai-paths/node-code-objects-v2/validator.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/validator.scaffold.json`
- v3 object id: `node_obj_validator_portable_v3`
- v3 object hash: `81f650d8c5f96b78f2e0635bf418536071d8df90e8a02fb0e74be9e9cb1db6c6`

## Ports

Inputs:
- `context`

Outputs:
- `context`
- `valid`
- `errors`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

