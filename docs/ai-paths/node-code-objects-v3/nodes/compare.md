---
owner: 'AI Paths Team'
last_reviewed: '2026-04-05'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Compare Migration Sheet (`compare`)

Generated at: 2026-04-05T14:57:58.017Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.compare.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 7

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/compare.json`
- Semantic hash: `08b496fef266ad268a39c60e85ab3f24dd844e05348c6498d5eaedf9bf56d3c0`
- v2 code object: `docs/ai-paths/node-code-objects-v2/compare.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/compare.scaffold.json`
- v3 object id: `node_obj_compare_portable_v3`
- v3 object hash: `02f0b6734820f9a736eaaab41a38570810444cc1bc7003bc58169e8d3cbf31ca`

## Ports

Inputs:
- `value`

Outputs:
- `value`
- `valid`
- `errors`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

