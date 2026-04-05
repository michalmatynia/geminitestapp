---
owner: 'AI Paths Team'
last_reviewed: '2026-04-05'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Audio Oscillator Migration Sheet (`audio_oscillator`)

Generated at: 2026-04-05T14:57:58.017Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.audio_oscillator.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 7

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/audio_oscillator.json`
- Semantic hash: `7baab1b01ab357f02eee514fc42f17c000caaa5d51e5610ca9197cbe0a9f8224`
- v2 code object: `docs/ai-paths/node-code-objects-v2/audio_oscillator.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/audio_oscillator.scaffold.json`
- v3 object id: `node_obj_audio_oscillator_portable_v3`
- v3 object hash: `1838c122b7579f16b837e6ad6461d6b2d22a134064cb716746820fa363948c8c`

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
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

