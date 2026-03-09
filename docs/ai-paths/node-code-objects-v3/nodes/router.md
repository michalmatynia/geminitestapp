---
owner: 'AI Paths Team'
last_reviewed: '2026-03-05'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Router Migration Sheet (`router`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.router.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 6

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/router.json`
- Semantic hash: `82e9ef3cc91bba0a0e65b487b31cc23a065df0740fd65ba429942efdfc4cc0d9`
- v2 code object: `docs/ai-paths/node-code-objects-v2/router.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/router.scaffold.json`
- v3 object id: `node_obj_router_portable_v3`
- v3 object hash: `a1637c9c049eceeebbc27427d4b8f4e9c024bf06d83b34fd336ffb43735387ec`

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

