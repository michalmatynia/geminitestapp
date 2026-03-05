# Database Query Migration Sheet (`database`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `legacy_adapter`
- Migration wave: `backlog`
- Code object ID: `not_assigned`
- Config field count: 41

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/database.json`
- Semantic hash: `eadd4fae4b6fd18c8374000db6b359b5cc64ea57a4ded245991a360e13e1eb73`
- v2 code object: `docs/ai-paths/node-code-objects-v2/database.json`
- v3 scaffold: `missing`
- v3 object id: `missing`
- v3 object hash: `missing`

## Ports

Inputs:
- `entityId`
- `entityType`
- `productId`
- `context`
- `query`
- `value`
- `bundle`
- `result`
- `content_en`
- `queryCallback`
- `schema`
- `aiQuery`

Outputs:
- `result`
- `bundle`
- `content_en`
- `aiPrompt`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

