# Constant Migration Sheet (`constant`)

Generated at: 2026-03-06T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.constant.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 5

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/constant.json`
- Semantic hash: `ae37de0024fb836784502eefbc5303bca55888d6d9621910b6e2c6170108f27b`
- v2 code object: `docs/ai-paths/node-code-objects-v2/constant.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/constant.scaffold.json`
- v3 object id: `node_obj_constant_portable_v3`
- v3 object hash: `cf21a090114f6663a4749f4000d0cb5ebc9e343fb1ec334aa60a2661b58d11ad`

## Ports

Inputs:
- (none)

Outputs:
- `value`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

