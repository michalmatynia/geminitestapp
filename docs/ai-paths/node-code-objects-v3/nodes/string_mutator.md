---
owner: 'AI Paths Team'
last_reviewed: '2026-04-10'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# String Mutator Migration Sheet (`string_mutator`)

Generated at: 2026-04-10T09:12:39.132Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.string_mutator.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 10

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/string_mutator.json`
- Semantic hash: `b4a7a5bd6dafb681eedc8a64a18cf2d7be58116b1bbad6f4db32bc916703b899`
- v2 code object: `docs/ai-paths/node-code-objects-v2/string_mutator.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/string_mutator.scaffold.json`
- v3 object id: `node_obj_string_mutator_portable_v3`
- v3 object hash: `80cb1ef198b2c9396494d561592cb3d850e5de5af9b096c9c8e713b61f1a1b19`

## Ports

Inputs:
- `value`
- `prompt`
- `result`

Outputs:
- `value`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

