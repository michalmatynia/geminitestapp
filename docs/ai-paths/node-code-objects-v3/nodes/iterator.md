# Iterator Migration Sheet (`iterator`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.iterator.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `no` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 5

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/iterator.json`
- Semantic hash: `80ba1661cabb2b734598b77d3924b0d4623db9e439978ef6137db125fbbecd79`
- v2 code object: `docs/ai-paths/node-code-objects-v2/iterator.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/iterator.scaffold.json`
- v3 object id: `node_obj_iterator_portable_v3`
- v3 object hash: `dae944bf214f313dc1c11d5892dee04fcdcd353a7b2ed71f83d6f3b6ad3feff0`

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

