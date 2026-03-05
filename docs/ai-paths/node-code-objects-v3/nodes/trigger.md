# Trigger: Image Studio Analysis Migration Sheet (`trigger`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.trigger.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `no` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 5

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/trigger.json`
- Semantic hash: `233c29f92acbe95972897af33d008a92c8026fc82bb6a1b721b60e0320116431`
- v2 code object: `docs/ai-paths/node-code-objects-v2/trigger.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/trigger.scaffold.json`
- v3 object id: `node_obj_trigger_portable_v3`
- v3 object hash: `b819305ec153c1cc968ab1ae5062c3d93a4713043f78591f8f3abc2fbf7e2e20`

## Ports

Inputs:
- (none)

Outputs:
- `trigger`
- `triggerName`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

