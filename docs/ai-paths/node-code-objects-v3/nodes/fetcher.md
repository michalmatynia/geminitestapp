# Fetcher: Trigger Context Migration Sheet (`fetcher`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `legacy_adapter`
- Migration wave: `backlog`
- Code object ID: `not_assigned`
- Config field count: 7

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/fetcher.json`
- Semantic hash: `b75a94276b7a8f77d8281fd3b6afbfb94bfbc8df9bcab61a8c23a4417a58c545`
- v2 code object: `docs/ai-paths/node-code-objects-v2/fetcher.json`
- v3 scaffold: `missing`
- v3 object id: `missing`
- v3 object hash: `missing`

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
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

