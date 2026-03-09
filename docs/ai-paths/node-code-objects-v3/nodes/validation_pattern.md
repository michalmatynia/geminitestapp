---
owner: 'AI Paths Team'
last_reviewed: '2026-03-05'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Validation Pattern Migration Sheet (`validation_pattern`)

Generated at: 2026-03-05T00:00:00.000Z

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
- v3 object hash: `0d8be52647277ec06255ed22dab15637e06837fdb792d1197c5ec440eb09311c`

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

