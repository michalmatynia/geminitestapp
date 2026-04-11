---
owner: 'AI Paths Team'
last_reviewed: '2026-04-11'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Template Migration Sheet (`template`)

Generated at: 2026-04-11T13:54:16.572Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.template.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 4

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/template.json`
- Semantic hash: `a61e6756bfbc5e139976478c63fa5ab3cf1c07342f9f33c74f9388079d857c4d`
- v2 code object: `docs/ai-paths/node-code-objects-v2/template.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/template.scaffold.json`
- v3 object id: `node_obj_template_portable_v3`
- v3 object hash: `d5435024cf669eee8e1e469777f9a818ec658cadc96002687b8306ebf12b2cae`

## Ports

Inputs:
- `template`
- `context`
- `value`
- `result`
- `bundle`

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

