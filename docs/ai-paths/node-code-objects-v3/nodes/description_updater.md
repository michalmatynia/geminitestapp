---
owner: 'AI Paths Team'
last_reviewed: '2026-03-05'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Description Updater (Deprecated) Migration Sheet (`description_updater`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.description_updater.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 3

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/description_updater.json`
- Semantic hash: `0140c1929e747f53a5f4f60043595787d367bdd869350012552e7cc185c69588`
- v2 code object: `docs/ai-paths/node-code-objects-v2/description_updater.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/description_updater.scaffold.json`
- v3 object id: `node_obj_description_updater_portable_v3`
- v3 object hash: `4706503301a91755619235ae20e8440314dbd609b5e1085744ef7c0c57dac051`

## Ports

Inputs:
- `productId`
- `description_en`

Outputs:
- `description_en`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

