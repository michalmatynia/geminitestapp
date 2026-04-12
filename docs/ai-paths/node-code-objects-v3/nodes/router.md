---
owner: 'AI Paths Team'
last_reviewed: '2026-04-12'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Router Migration Sheet (`router`)

Generated at: 2026-04-12T04:59:57.716Z

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
- v3 object hash: `947a264959809dd05f7ce0cb8745c430ac5724b92bb44ed1d416f043ec8534ff`

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

