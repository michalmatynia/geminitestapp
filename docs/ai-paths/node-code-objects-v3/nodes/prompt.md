# Prompt Migration Sheet (`prompt`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `legacy_adapter`
- Migration wave: `backlog`
- Code object ID: `not_assigned`
- Config field count: 4

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/prompt.json`
- Semantic hash: `98e6f0ffd5cb8cdce5426c507661c7c7a1d9c7aae1c2aca8deb89ddae4375bde`
- v2 code object: `docs/ai-paths/node-code-objects-v2/prompt.json`
- v3 scaffold: `missing`
- v3 object id: `missing`
- v3 object hash: `missing`

## Ports

Inputs:
- `bundle`
- `title`
- `images`
- `result`
- `entityId`

Outputs:
- `prompt`
- `images`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

