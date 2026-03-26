---
owner: 'AI Paths Team'
last_reviewed: '2026-03-26'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Compare Migration Sheet (`compare`)

Generated at: 2026-03-26T12:17:00.706Z

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
- v3 object hash: `36551f48875e54fb823c8eb032468e0818238106ff83d46a8613b7a74891566f`

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

