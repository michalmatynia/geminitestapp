# Playwright Migration Sheet (`playwright`)

Generated at: 2026-03-06T00:00:00.000Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `pilot`
- Code object ID: `ai-paths.node-code-object.playwright.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `v3-pilot-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 16

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/playwright.json`
- Semantic hash: `7fe5f58cbada808ffbcf5fdcafb8ad435b9278f38320239f6b66897e3d2d0056`
- v2 code object: `docs/ai-paths/node-code-objects-v2/playwright.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/playwright.scaffold.json`
- v3 object id: `node_obj_playwright_portable_v3`
- v3 object hash: `c0ece42ab8841f5f24e7d6963b1e494cf4d56020d7f4864058923b6ed94dcff1`

## Ports

Inputs:
- `url`
- `bundle`
- `context`

Outputs:
- `result`
- `jobId`
- `screenshot`
- `html`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

