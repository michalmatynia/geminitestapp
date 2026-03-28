---
owner: 'AI Paths Team'
last_reviewed: '2026-03-28'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Validator Migration Sheet (`validator`)

Generated at: 2026-03-28T14:11:54.225Z

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
- v3 object hash: `8ca6895cb0abf095d10c6679970896cb684fd08f2747fe0db4fd9a4166a1862a`

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

