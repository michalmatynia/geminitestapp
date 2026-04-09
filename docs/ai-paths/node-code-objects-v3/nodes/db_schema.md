---
owner: 'AI Paths Team'
last_reviewed: '2026-04-05'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Database Schema Migration Sheet (`db_schema`)

Generated at: 2026-04-05T14:57:57.569Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.db_schema.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 13

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/db_schema.json`
- Semantic hash: `9de668727483c8c0852e9b3c5d211aaa0d14c3f76a6943e7c1093d18c20fb0d1`
- v2 code object: `docs/ai-paths/node-code-objects-v2/db_schema.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/db_schema.scaffold.json`
- v3 object id: `node_obj_db_schema_portable_v3`
- v3 object hash: `8f9157a45b9a06fcd60c38661e0ba1ea219452a8d111e5c7e4a87f8ed5288905`

## Ports

Inputs:
- (none)

Outputs:
- `schema`
- `context`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

