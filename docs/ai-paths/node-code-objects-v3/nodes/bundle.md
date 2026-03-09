---
owner: 'AI Paths Team'
last_reviewed: '2026-03-05'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Bundle Migration Sheet (`bundle`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.bundle.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 4

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/bundle.json`
- Semantic hash: `f02021c0cfff57b77cf446d8b1d8740edd80c73e9b4d2b39a2b2474fbe707385`
- v2 code object: `docs/ai-paths/node-code-objects-v2/bundle.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/bundle.scaffold.json`
- v3 object id: `node_obj_bundle_portable_v3`
- v3 object hash: `128dc8b581e6fa336c213a421a0863032cb065d373fd9e2c5d99557f6b8fca75`

## Ports

Inputs:
- `value`
- `productId`
- `content_en`
- `images`
- `title`

Outputs:
- `bundle`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

