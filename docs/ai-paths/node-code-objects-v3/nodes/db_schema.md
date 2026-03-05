# Database Schema Migration Sheet (`db_schema`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.db_schema.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `no` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 9

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/db_schema.json`
- Semantic hash: `dc56e39b3002dc63ba6b609293b11b296ef5616fbc1eec589de7882b694ecdc6`
- v2 code object: `docs/ai-paths/node-code-objects-v2/db_schema.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/db_schema.scaffold.json`
- v3 object id: `node_obj_db_schema_portable_v3`
- v3 object hash: `86528cde5227693e6df921247af672d0d22c164d2dcc974e27c4f75db7ab4727`

## Ports

Inputs:
- (none)

Outputs:
- `schema`
- `context`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

