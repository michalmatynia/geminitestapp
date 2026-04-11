---
owner: 'AI Paths Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Regex Grouper Migration Sheet (`regex`)

Generated at: 2026-04-11T13:54:16.572Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.regex.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 15

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/regex.json`
- Semantic hash: `119b8b6056ec81cb38c9cbd2d5cc55c2353a94bf86fd0ad407fc9e9f06eb251e`
- v2 code object: `docs/ai-paths/node-code-objects-v2/regex.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/regex.scaffold.json`
- v3 object id: `node_obj_regex_portable_v3`
- v3 object hash: `6044a6e0f73a49e2b688d582cfeedb9873272c4c76ec8b97422a6edeeba18140`

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
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

