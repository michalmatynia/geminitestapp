---
owner: 'AI Paths Team'
last_reviewed: '2026-04-05'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Reasoning Agent Migration Sheet (`agent`)

Generated at: 2026-04-05T14:57:58.017Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.agent.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 6

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/agent.json`
- Semantic hash: `ed2953a2fed7b2b3df7daed875bce21aaca13836d56e95b9995e05c33bb2b99b`
- v2 code object: `docs/ai-paths/node-code-objects-v2/agent.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/agent.scaffold.json`
- v3 object id: `node_obj_agent_portable_v3`
- v3 object hash: `d9321e2c67f8fcc92ee05466e840a5e2f93e79844f4167695932182e66387f20`

## Ports

Inputs:
- `prompt`
- `bundle`
- `context`
- `entityJson`

Outputs:
- `result`
- `jobId`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

