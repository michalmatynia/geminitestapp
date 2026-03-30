---
owner: 'AI Paths Team'
last_reviewed: '2026-03-28'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# JSON Mapper Migration Sheet (`mapper`)

Generated at: 2026-03-28T14:11:54.225Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.mapper.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 6

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/mapper.json`
- Semantic hash: `4fe386d977d549e3093ddd028db6ed2da07b6962e3f6c7f0f3e980e8a07ceba1`
- v2 code object: `docs/ai-paths/node-code-objects-v2/mapper.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/mapper.scaffold.json`
- v3 object id: `node_obj_mapper_portable_v3`
- v3 object hash: `4347ea4b775dafa85b0137d878ce4ef259c2a7e065b4a24b07a6a32d42b72823`

## Ports

Inputs:
- `context`
- `result`
- `bundle`
- `value`

Outputs:
- `value`
- `result`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

