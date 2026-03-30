---
owner: 'AI Paths Team'
last_reviewed: '2026-03-28'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# API Operation (Advanced) Migration Sheet (`api_advanced`)

Generated at: 2026-03-28T14:11:54.225Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.api_advanced.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 17

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/api_advanced.json`
- Semantic hash: `37b85ffa57728292544aa9cd66b45bbf4e5bbf9dafc436d4b5819340e52277b1`
- v2 code object: `docs/ai-paths/node-code-objects-v2/api_advanced.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/api_advanced.scaffold.json`
- v3 object id: `node_obj_api_advanced_portable_v3`
- v3 object hash: `475f4eaeb80a8d9debf3ba73c7723ceeda53111b7f9fea77374e42520eefb0fd`

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
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

