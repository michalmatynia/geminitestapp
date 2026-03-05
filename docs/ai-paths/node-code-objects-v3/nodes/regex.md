# Regex Grouper Migration Sheet (`regex`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.regex.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `no` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 15

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/regex.json`
- Semantic hash: `119b8b6056ec81cb38c9cbd2d5cc55c2353a94bf86fd0ad407fc9e9f06eb251e`
- v2 code object: `docs/ai-paths/node-code-objects-v2/regex.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/regex.scaffold.json`
- v3 object id: `node_obj_regex_portable_v3`
- v3 object hash: `d1752a00d7dd0d3bd36a924ac414d5cbc518b2a17b8e29eb75d27880ad8c7f92`

## Ports

Inputs:
- `value`
- `prompt`
- `regexCallback`

Outputs:
- `grouped`
- `matches`
- `value`
- `aiPrompt`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

