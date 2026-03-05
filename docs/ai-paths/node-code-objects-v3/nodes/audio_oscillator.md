# Audio Oscillator Migration Sheet (`audio_oscillator`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.audio_oscillator.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `no` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 7

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/audio_oscillator.json`
- Semantic hash: `7baab1b01ab357f02eee514fc42f17c000caaa5d51e5610ca9197cbe0a9f8224`
- v2 code object: `docs/ai-paths/node-code-objects-v2/audio_oscillator.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/audio_oscillator.scaffold.json`
- v3 object id: `node_obj_audio_oscillator_portable_v3`
- v3 object hash: `9580ebad3164c3d5af98cd622a957bbc3941e4b3d69827407a11c6b21cad6fbf`

## Ports

Inputs:
- `frequency`
- `waveform`
- `gain`
- `durationMs`
- `trigger`

Outputs:
- `audioSignal`
- `frequency`
- `waveform`
- `gain`
- `durationMs`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

