---
owner: 'AI Paths Team'
last_reviewed: '2026-03-28'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Math Migration Sheet (`math`)

Generated at: 2026-03-28T14:11:54.225Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.math.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 5

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/math.json`
- Semantic hash: `d5cf086af1271545687273d8182e3ceb628aa14edb31fec62ff95b5fa970267d`
- v2 code object: `docs/ai-paths/node-code-objects-v2/math.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/math.scaffold.json`
- v3 object id: `node_obj_math_portable_v3`
- v3 object hash: `5817fea5d1e5aa85f0ac4ddb81023ad0da764bbc96ea3646b702c86f5a85c234`

## Ports

Inputs:
- `value`

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

