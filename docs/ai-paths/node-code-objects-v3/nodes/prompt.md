# Prompt Migration Sheet (`prompt`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.prompt.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `no` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 4

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/prompt.json`
- Semantic hash: `98e6f0ffd5cb8cdce5426c507661c7c7a1d9c7aae1c2aca8deb89ddae4375bde`
- v2 code object: `docs/ai-paths/node-code-objects-v2/prompt.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/prompt.scaffold.json`
- v3 object id: `node_obj_prompt_portable_v3`
- v3 object hash: `23711dacb5763f7eebf19f39d9c1155d0da28b71f215990ef3e835745a7fb1bc`

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

