---
owner: 'AI Paths Team'
last_reviewed: '2026-04-10'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Delay Migration Sheet (`delay`)

Generated at: 2026-04-10T09:12:39.132Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.delay.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 4

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/delay.json`
- Semantic hash: `fa631c84b720f9f975e8da3f24935e4d1b5d36ff103e58319691af9d07f5bd30`
- v2 code object: `docs/ai-paths/node-code-objects-v2/delay.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/delay.scaffold.json`
- v3 object id: `node_obj_delay_portable_v3`
- v3 object hash: `2d35e8bcc20d6732becda607e5ac3765094b730c1bb3d20eef47d25da1a1edc1`

## Ports

Inputs:
- `value`
- `bundle`

Outputs:
- `value`
- `bundle`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

