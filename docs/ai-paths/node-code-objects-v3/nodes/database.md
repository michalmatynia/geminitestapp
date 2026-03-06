# Database Query Migration Sheet (`database`)

Generated at: 2026-03-06T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.database.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 41

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/database.json`
- Semantic hash: `eadd4fae4b6fd18c8374000db6b359b5cc64ea57a4ded245991a360e13e1eb73`
- v2 code object: `docs/ai-paths/node-code-objects-v2/database.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/database.scaffold.json`
- v3 object id: `node_obj_database_portable_v3`
- v3 object hash: `e9dd65fa9b13d6e59558fafcfb7fa3b517800808a6065f91b7c18aa4f627d7c8`

## Ports

Inputs:
- `entityId`
- `entityType`
- `productId`
- `context`
- `query`
- `value`
- `bundle`
- `result`
- `content_en`
- `queryCallback`
- `schema`
- `aiQuery`

Outputs:
- `result`
- `bundle`
- `content_en`
- `aiPrompt`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

