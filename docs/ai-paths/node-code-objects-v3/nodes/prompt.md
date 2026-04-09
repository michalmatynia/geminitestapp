---
owner: 'AI Paths Team'
last_reviewed: '2026-04-05'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Prompt Migration Sheet (`prompt`)

Generated at: 2026-04-05T14:57:57.569Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.prompt.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 4

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/prompt.json`
- Semantic hash: `98e6f0ffd5cb8cdce5426c507661c7c7a1d9c7aae1c2aca8deb89ddae4375bde`
- v2 code object: `docs/ai-paths/node-code-objects-v2/prompt.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/prompt.scaffold.json`
- v3 object id: `node_obj_prompt_portable_v3`
- v3 object hash: `f4661d199bf1af0b2a63816c6c059a32875287aeb5b31e5c77032102ecf61148`

## Ports

Inputs:
- `bundle`
- `title`
- `images`
- `result`
- `entityId`

Outputs:
- `prompt`
- `images`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

