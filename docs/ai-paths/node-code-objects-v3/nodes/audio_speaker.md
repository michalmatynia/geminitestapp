# Audio Speaker (Mono) Migration Sheet (`audio_speaker`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `legacy_adapter`
- Migration wave: `backlog`
- Code object ID: `not_assigned`
- Config field count: 7

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/audio_speaker.json`
- Semantic hash: `37a4b7541ec63acc4d5d1797a0871d52f1d3fa54d8dc44cf6fc350796c3b0d3e`
- v2 code object: `docs/ai-paths/node-code-objects-v2/audio_speaker.json`
- v3 scaffold: `missing`
- v3 object id: `missing`
- v3 object hash: `missing`

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
- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).
- [ ] Runtime kernel pilot list updated when rollout is approved.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

