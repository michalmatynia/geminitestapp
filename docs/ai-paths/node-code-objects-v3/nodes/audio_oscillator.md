# Audio Oscillator Migration Sheet (`audio_oscillator`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `legacy_adapter`
- Migration wave: `backlog`
- Code object ID: `not_assigned`
- Config field count: 7

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/audio_oscillator.json`
- Semantic hash: `7baab1b01ab357f02eee514fc42f17c000caaa5d51e5610ca9197cbe0a9f8224`
- v2 code object: `docs/ai-paths/node-code-objects-v2/audio_oscillator.json`
- v3 scaffold: `missing`
- v3 object id: `missing`
- v3 object hash: `missing`

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

