# Audio Speaker (Mono) Migration Sheet (`audio_speaker`)

Generated at: 2026-03-06T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.audio_speaker.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 7

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/audio_speaker.json`
- Semantic hash: `37a4b7541ec63acc4d5d1797a0871d52f1d3fa54d8dc44cf6fc350796c3b0d3e`
- v2 code object: `docs/ai-paths/node-code-objects-v2/audio_speaker.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/audio_speaker.scaffold.json`
- v3 object id: `node_obj_audio_speaker_portable_v3`
- v3 object hash: `37a69c75b8bbef7d295d7ea8ed0af058729a3bf62bbd8b39e22e4d621bd6286a`

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

