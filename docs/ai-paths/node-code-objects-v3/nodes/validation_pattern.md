---
owner: 'AI Paths Team'
last_reviewed: '2026-04-05'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Validation Pattern Migration Sheet (`validation_pattern`)

Generated at: 2026-04-05T14:57:57.569Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.validation_pattern.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 14

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/validation_pattern.json`
- Semantic hash: `e64e35e2fd1184b3b984c4645f0778f6bd2c5a415224fbc949e5418eb706978f`
- v2 code object: `docs/ai-paths/node-code-objects-v2/validation_pattern.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/validation_pattern.scaffold.json`
- v3 object id: `node_obj_validation_pattern_portable_v3`
- v3 object hash: `71bb929485b146e3cbd922bc0bddfc2ee3fc53cc7b773b34d9052c20784c0618`

## Ports

Inputs:
- `value`
- `prompt`
- `result`
- `context`

Outputs:
- `value`
- `result`
- `context`
- `valid`
- `errors`
- `bundle`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

