---
owner: 'AI Paths Team'
last_reviewed: '2026-03-28'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Fetcher: Trigger Context Migration Sheet (`fetcher`)

Generated at: 2026-03-28T14:11:54.225Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.fetcher.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 7

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/fetcher.json`
- Semantic hash: `b75a94276b7a8f77d8281fd3b6afbfb94bfbc8df9bcab61a8c23a4417a58c545`
- v2 code object: `docs/ai-paths/node-code-objects-v2/fetcher.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/fetcher.scaffold.json`
- v3 object id: `node_obj_fetcher_portable_v3`
- v3 object hash: `8b5f846ecaf29b70bc9ef6646c305400b1158543bae6216634ef36725ccc4cda`

## Ports

Inputs:
- `trigger`
- `context`
- `meta`
- `entityId`
- `entityType`

Outputs:
- `context`
- `meta`
- `entityId`
- `entityType`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

