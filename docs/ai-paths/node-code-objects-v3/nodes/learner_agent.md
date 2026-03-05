# Learner Agent Migration Sheet (`learner_agent`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.learner_agent.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `no` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 6

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/learner_agent.json`
- Semantic hash: `5009d070f150f40646cabdfa36f86858c8636c2e645f230d39698aa465f653e2`
- v2 code object: `docs/ai-paths/node-code-objects-v2/learner_agent.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/learner_agent.scaffold.json`
- v3 object id: `node_obj_learner_agent_portable_v3`
- v3 object hash: `07ac3c2ba602a5997d4181fb6a4c5937dabce6d6cc26f55dc104e7354cea4c80`

## Ports

Inputs:
- `prompt`
- `bundle`

Outputs:
- `result`
- `jobId`
- `sources`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

