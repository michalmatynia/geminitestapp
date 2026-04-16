---
owner: 'AI Paths Team'
last_reviewed: '2026-04-12'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Learner Agent Migration Sheet (`learner_agent`)

Generated at: 2026-04-12T04:59:57.716Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.learner_agent.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 6

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/learner_agent.json`
- Semantic hash: `5009d070f150f40646cabdfa36f86858c8636c2e645f230d39698aa465f653e2`
- v2 code object: `docs/ai-paths/node-code-objects-v2/learner_agent.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/learner_agent.scaffold.json`
- v3 object id: `node_obj_learner_agent_portable_v3`
- v3 object hash: `37ae40417a0ea0c9a4b14622fa33eafd982be19d042b1720fdf3323e8844fdf9`

## Ports

Inputs:
- `prompt`
- `bundle`

Outputs:
- `result`
- `jobId`
- `sources`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

