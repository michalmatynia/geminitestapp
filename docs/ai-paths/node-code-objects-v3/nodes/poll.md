---
owner: 'AI Paths Team'
last_reviewed: '2026-04-12'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Poll Job Migration Sheet (`poll`)

Generated at: 2026-04-12T04:59:57.716Z

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
- Semantic hash: `bb7015cd076699cef0d1a540842e8e22fed2734a68d76cbe89d2dec030485389`
- v2 code object: `docs/ai-paths/node-code-objects-v2/poll.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/poll.scaffold.json`
- v3 object id: `node_obj_poll_portable_v3`
- v3 object hash: `28b51be3cb4b024a70fda39056630567a85615ce6837d4fa959d7048d5f930cd`

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

