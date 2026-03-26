---
owner: 'AI Paths Team'
last_reviewed: '2026-03-26'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# HTTP Fetch Migration Sheet (`http`)

Generated at: 2026-03-26T12:17:00.706Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.http.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 9

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/http.json`
- Semantic hash: `19960ba99dd579f48b6b5aaca8261193573a80a4a7222db9bef9b5de518fc6c2`
- v2 code object: `docs/ai-paths/node-code-objects-v2/http.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/http.scaffold.json`
- v3 object id: `node_obj_http_portable_v3`
- v3 object hash: `73f0c1bae7b5bdfa019db3fc38b0c4d92f798c3a5ea37042659b96177a749b25`

## Ports

Inputs:
- `url`
- `body`
- `headers`
- `bundle`

Outputs:
- `value`
- `bundle`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

