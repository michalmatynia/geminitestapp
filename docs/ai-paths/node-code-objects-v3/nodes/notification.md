# Toast Notification Migration Sheet (`notification`)

Generated at: 2026-03-06T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.notification.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 3

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/notification.json`
- Semantic hash: `171fd2da082697571cfa13252042393d4b5069c0befbda30b6f1e508d64d37d1`
- v2 code object: `docs/ai-paths/node-code-objects-v2/notification.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/notification.scaffold.json`
- v3 object id: `node_obj_notification_portable_v3`
- v3 object hash: `2b1a98f49ec8f6de9d87eea5a5dfefb4a96d86345141a7f3294130329bfdeb3c`

## Ports

Inputs:
- `value`
- `bundle`
- `title`

Outputs:
- (none)

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

