---
owner: 'AI Paths Team'
last_reviewed: '2026-04-10'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Audio Speaker (Mono) Migration Sheet (`audio_speaker`)

Generated at: 2026-04-10T09:12:39.132Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.audio_speaker.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 7

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/audio_speaker.json`
- Semantic hash: `37a4b7541ec63acc4d5d1797a0871d52f1d3fa54d8dc44cf6fc350796c3b0d3e`
- v2 code object: `docs/ai-paths/node-code-objects-v2/audio_speaker.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/audio_speaker.scaffold.json`
- v3 object id: `node_obj_audio_speaker_portable_v3`
- v3 object hash: `be2a5953928b574682f9f5057312f64cce8058a60d1972e0faa2f97efe7dd131`

## Ports

Inputs:
- `audioSignal`
- `frequency`
- `waveform`
- `gain`
- `durationMs`
- `trigger`

Outputs:
- `status`
- `audioSignal`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

