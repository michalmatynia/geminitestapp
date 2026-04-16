---
owner: 'AI Paths Team'
last_reviewed: '2026-04-12'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Validator Migration Sheet (`validator`)

Generated at: 2026-04-12T04:59:57.716Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.validator.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 5

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/validator.json`
- Semantic hash: `626a3f87a56184a58e1c7c3f488383a855a2ce50a97bbcef42898d28788d8619`
- v2 code object: `docs/ai-paths/node-code-objects-v2/validator.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/validator.scaffold.json`
- v3 object id: `node_obj_validator_portable_v3`
- v3 object hash: `71783da70ccd31282e41ce5a93e33d7ff82793b0d754857c0f7afa7e58cbd0d1`

## Ports

Inputs:
- `context`

Outputs:
- `context`
- `valid`
- `errors`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

