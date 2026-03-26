---
owner: 'AI Paths Team'
last_reviewed: '2026-03-26'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Constant Migration Sheet (`constant`)

Generated at: 2026-03-26T12:17:00.706Z

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
- v3 object hash: `49b8f4e156add4a579e30292b2c49fe2c4bd8e52ee2f52c9bc301e148c07d648`

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

