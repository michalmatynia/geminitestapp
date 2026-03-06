# Template Migration Sheet (`template`)

Generated at: 2026-03-06T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.template.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 4

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/template.json`
- Semantic hash: `349143bb99ff84ec6f3ceba1c8d8a24e48682e23c0679ef6bc8ff3048636640c`
- v2 code object: `docs/ai-paths/node-code-objects-v2/template.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/template.scaffold.json`
- v3 object id: `node_obj_template_portable_v3`
- v3 object hash: `965d96a2ba08e5b736eb4dc2d604ec9b0f294161f947706874428c97789d3813`

## Ports

Inputs:
- `bundle`
- `value`
- `productId`

Outputs:
- `prompt`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

