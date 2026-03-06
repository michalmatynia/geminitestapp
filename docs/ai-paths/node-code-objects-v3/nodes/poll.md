# Poll Job Migration Sheet (`poll`)

Generated at: 2026-03-06T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.poll.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 21

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/poll.json`
- Semantic hash: `86f5979ebe33fa966505a2c2bdb7ab279df0696faf94fb4605a561b7e196cdb2`
- v2 code object: `docs/ai-paths/node-code-objects-v2/poll.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/poll.scaffold.json`
- v3 object id: `node_obj_poll_portable_v3`
- v3 object hash: `9cad4badd18cff9ae65eb54f2adb78fb3bbbc42c72c6bee5913bdecd9aa2ed85`

## Ports

Inputs:
- `jobId`
- `query`
- `value`
- `entityId`
- `productId`
- `bundle`

Outputs:
- `result`
- `status`
- `jobId`
- `bundle`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

