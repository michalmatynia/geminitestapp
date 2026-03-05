# JSON Mapper Migration Sheet (`mapper`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.mapper.v3`
- Readiness stage: `pilot_indexed`
- Readiness score: 80/100
- Readiness blockers: `parity_not_validated`
- Config field count: 6

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/mapper.json`
- Semantic hash: `4fe386d977d549e3093ddd028db6ed2da07b6962e3f6c7f0f3e980e8a07ceba1`
- v2 code object: `docs/ai-paths/node-code-objects-v2/mapper.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/mapper.scaffold.json`
- v3 object id: `node_obj_mapper_portable_v3`
- v3 object hash: `418bee8d6f699d37a707364dc3bf9af3a2720f8ede7432ee0a1de3d3bc357975`

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
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

