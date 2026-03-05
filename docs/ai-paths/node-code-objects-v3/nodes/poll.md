# Poll Job Migration Sheet (`poll`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.poll.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `no` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 21

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/poll.json`
- Semantic hash: `86f5979ebe33fa966505a2c2bdb7ab279df0696faf94fb4605a561b7e196cdb2`
- v2 code object: `docs/ai-paths/node-code-objects-v2/poll.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/poll.scaffold.json`
- v3 object id: `node_obj_poll_portable_v3`
- v3 object hash: `dc22572b507d6f585c827ba13dac9de96bddd3b79fddd0a176ddbb58bf3f6cbe`

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
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

