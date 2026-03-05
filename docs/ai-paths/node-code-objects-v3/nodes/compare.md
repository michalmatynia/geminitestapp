# Compare Migration Sheet (`compare`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.compare.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `no` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 7

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/compare.json`
- Semantic hash: `08b496fef266ad268a39c60e85ab3f24dd844e05348c6498d5eaedf9bf56d3c0`
- v2 code object: `docs/ai-paths/node-code-objects-v2/compare.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/compare.scaffold.json`
- v3 object id: `node_obj_compare_portable_v3`
- v3 object hash: `27cd022de9a91da8088d4845d0bcc7da25818e41ca6ab312523b59477a9e6265`

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
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

