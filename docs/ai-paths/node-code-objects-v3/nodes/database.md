---
owner: 'AI Paths Team'
last_reviewed: '2026-04-05'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Database Query Migration Sheet (`database`)

Generated at: 2026-04-05T14:57:57.569Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.database.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 42

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/database.json`
- Semantic hash: `a17f4531e80e4fb9fdafed92034945f869cc67156426639bbe62733c49e6a6c4`
- v2 code object: `docs/ai-paths/node-code-objects-v2/database.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/database.scaffold.json`
- v3 object id: `node_obj_database_portable_v3`
- v3 object hash: `68bdd970676e9a8026b7854443262bafee92efb051b5e71636fb591e488f0298`

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

