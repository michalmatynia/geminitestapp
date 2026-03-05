# API Operation (Advanced) Migration Sheet (`api_advanced`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `legacy_adapter`
- Migration wave: `backlog`
- Code object ID: `not_assigned`
- Config field count: 17

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/api_advanced.json`
- Semantic hash: `37b85ffa57728292544aa9cd66b45bbf4e5bbf9dafc436d4b5819340e52277b1`
- v2 code object: `docs/ai-paths/node-code-objects-v2/api_advanced.json`
- v3 scaffold: `missing`
- v3 object id: `missing`
- v3 object hash: `missing`

## Ports

Inputs:
- `url`
- `body`
- `headers`
- `params`
- `bundle`

Outputs:
- `value`
- `bundle`
- `status`
- `headers`
- `items`
- `route`
- `error`
- `success`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

