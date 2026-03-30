---
owner: 'AI Paths Team'
last_reviewed: '2026-03-28'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Database Schema Migration Sheet (`db_schema`)

Generated at: 2026-03-28T14:11:54.225Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.db_schema.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 9

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/db_schema.json`
- Semantic hash: `a872b63af24b71cdcd57441d6a49d748f0a8c9d9a586a5b092a8ba97964a499f`
- v2 code object: `docs/ai-paths/node-code-objects-v2/db_schema.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/db_schema.scaffold.json`
- v3 object id: `node_obj_db_schema_portable_v3`
- v3 object hash: `e17d5405b4823b3af5fc1fb5a4d906640cb71d572541471f741ee4873963d401`

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

