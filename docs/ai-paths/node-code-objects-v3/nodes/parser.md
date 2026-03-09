---
owner: 'AI Paths Team'
last_reviewed: '2026-03-05'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# JSON Parser Migration Sheet (`parser`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.parser.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 6

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/parser.json`
- Semantic hash: `f4efe5d4248e963cb61027db51299b57b9d7fb3bbb1beba1a260c8e531493771`
- v2 code object: `docs/ai-paths/node-code-objects-v2/parser.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/parser.scaffold.json`
- v3 object id: `node_obj_parser_portable_v3`
- v3 object hash: `7890aca2b93289bbbb77469614dc81d7fc5296c284bdbf60e241a2515fe22d83`

## Ports

Inputs:
- `entityJson`
- `context`

Outputs:
- `productId`
- `title`
- `images`
- `content_en`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

