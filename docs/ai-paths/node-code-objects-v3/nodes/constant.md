---
owner: 'AI Paths Team'
last_reviewed: '2026-04-12'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Constant Migration Sheet (`constant`)

Generated at: 2026-04-12T04:59:57.716Z

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
- v3 object hash: `813abe83268969cbc3bcf6dd689cf0d09c28e82ee00835a798d709e3c61dbf82`

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

