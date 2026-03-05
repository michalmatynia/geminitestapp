# JSON Parser Migration Sheet (`parser`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.parser.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Config field count: 6

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/parser.json`
- Semantic hash: `f4efe5d4248e963cb61027db51299b57b9d7fb3bbb1beba1a260c8e531493771`
- v2 code object: `docs/ai-paths/node-code-objects-v2/parser.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/parser.scaffold.json`
- v3 object id: `node_obj_parser_portable_v3`
- v3 object hash: `83efe93a40ada920ed7c4feff0c841eb18caf7710804975dc8ad160834c0fd5a`

## Ports

Inputs:
- `entityJson`
- `context`

Outputs:
- `productId`
- `title`
- `images`
- `content_en`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

