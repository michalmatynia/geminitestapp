# Fetcher: Trigger Context Migration Sheet (`fetcher`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.fetcher.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `no` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 7

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/fetcher.json`
- Semantic hash: `b75a94276b7a8f77d8281fd3b6afbfb94bfbc8df9bcab61a8c23a4417a58c545`
- v2 code object: `docs/ai-paths/node-code-objects-v2/fetcher.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/fetcher.scaffold.json`
- v3 object id: `node_obj_fetcher_portable_v3`
- v3 object hash: `6e0e7cb5f8f711d9b4a0222deb4ac066656de78e68a2ad6fb59d935ddcc17524`

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

