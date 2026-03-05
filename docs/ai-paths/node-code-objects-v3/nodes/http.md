# HTTP Fetch Migration Sheet (`http`)

Generated at: 2026-03-05T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.http.v3`
- Readiness stage: `rollout_candidate`
- Readiness score: 90/100
- Readiness blockers: `rollout_not_approved`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `no` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 9

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/http.json`
- Semantic hash: `19960ba99dd579f48b6b5aaca8261193573a80a4a7222db9bef9b5de518fc6c2`
- v2 code object: `docs/ai-paths/node-code-objects-v2/http.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/http.scaffold.json`
- v3 object id: `node_obj_http_portable_v3`
- v3 object hash: `d04742150b2ce59424ebefa3cb2708ef329f8f10b63808192cfda7767fb3e272`

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

