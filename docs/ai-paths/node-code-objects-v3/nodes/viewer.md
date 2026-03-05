# Result Viewer Migration Sheet (`viewer`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.viewer.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `no` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 5

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/viewer.json`
- Semantic hash: `4a4c8d08ad55fc833ebc93a11f861e66dbbf5af48bc240eece2270de24c930af`
- v2 code object: `docs/ai-paths/node-code-objects-v2/viewer.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/viewer.scaffold.json`
- v3 object id: `node_obj_viewer_portable_v3`
- v3 object hash: `e05a8a71e2a778b49351aff81d30d9c767ed59ab4b57c3a0c0aa4b96c08c82f9`

## Ports

Inputs:
- `result`
- `sources`
- `grouped`
- `matches`
- `index`
- `total`
- `done`
- `analysis`
- `description`
- `description_en`
- `prompt`
- `images`
- `title`
- `productId`
- `content_en`
- `context`
- `meta`
- `trigger`
- `triggerName`
- `jobId`
- `status`
- `entityId`
- `entityType`
- `entityJson`
- `bundle`
- `valid`
- `errors`
- `value`
- `audioSignal`
- `frequency`
- `waveform`
- `gain`
- `durationMs`
- `queryCallback`
- `aiPrompt`

Outputs:
- (none)

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

