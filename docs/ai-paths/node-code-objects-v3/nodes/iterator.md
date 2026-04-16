---
owner: 'AI Paths Team'
last_reviewed: '2026-04-12'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Iterator Migration Sheet (`iterator`)

Generated at: 2026-04-12T04:59:57.716Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.iterator.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 5

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/iterator.json`
- Semantic hash: `80ba1661cabb2b734598b77d3924b0d4623db9e439978ef6137db125fbbecd79`
- v2 code object: `docs/ai-paths/node-code-objects-v2/iterator.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/iterator.scaffold.json`
- v3 object id: `node_obj_iterator_portable_v3`
- v3 object hash: `ec6c493b52fd6a50f3f9f1975aa60408e22cd715f9020ce10a6a32a9dd73ab00`

## Ports

Inputs:
- `value`
- `callback`

Outputs:
- `value`
- `index`
- `total`
- `done`
- `status`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

