# Delay Migration Sheet (`delay`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `legacy_adapter`
- Migration wave: `backlog`
- Code object ID: `not_assigned`
- Readiness stage: `cataloged`
- Readiness score: 35/100
- Readiness blockers: `missing_v3_scaffold`, `not_in_v3_pilot`
- Parity evidence suite IDs: `none`
- Config field count: 4

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/delay.json`
- Semantic hash: `fa631c84b720f9f975e8da3f24935e4d1b5d36ff103e58319691af9d07f5bd30`
- v2 code object: `docs/ai-paths/node-code-objects-v2/delay.json`
- v3 scaffold: `missing`
- v3 object id: `missing`
- v3 object hash: `missing`

## Ports

Inputs:
- `value`
- `bundle`

Outputs:
- `value`
- `bundle`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

