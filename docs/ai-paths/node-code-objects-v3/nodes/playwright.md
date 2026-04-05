---
owner: 'AI Paths Team'
last_reviewed: '2026-04-05'
status: 'generated'
doc_type: 'generated'
scope: 'feature:ai-paths'
canonical: true
---
# Playwright: Batch Capture Migration Sheet (`playwright`)

Generated at: 2026-04-05T14:57:58.017Z

## Status

- Runtime strategy: `code_object_v3`
- Migration wave: `runtime_kernel`
- Code object ID: `ai-paths.node-code-object.playwright.v3`
- Readiness stage: `rollout_approved`
- Readiness score: 100/100
- Readiness blockers: `none`
- Parity evidence suite IDs: `runtime-kernel-parity-core`
- Rollout approved: `yes` (source: `docs/ai-paths/node-code-objects-v3/rollout-approvals.json`)
- Config field count: 16

## Node Contract Files

- Semantic node contract: `docs/ai-paths/semantic-grammar/nodes/playwright.json`
- Semantic hash: `7fe5f58cbada808ffbcf5fdcafb8ad435b9278f38320239f6b66897e3d2d0056`
- v2 code object: `docs/ai-paths/node-code-objects-v2/playwright.json`
- v3 scaffold: `docs/ai-paths/node-code-objects-v3/playwright.scaffold.json`
- v3 object id: `node_obj_playwright_portable_v3`
- v3 object hash: `2a20d91e30acef0a6b29920569e177bbfac213e9ca182b48ce037ac55c8b0c35`

## Ports

Inputs:
- `captures`
- `appearanceMode`
- `bundle`
- `context`

Outputs:
- `result`
- `jobId`
- `bundle`

## Migration Checklist

- [ ] Semantic contract reviewed against UI config fields.
- [ ] v3 scaffold authored or updated for this node.
- [ ] Runtime parity validated for the migrated node execution path.
- [ ] Native handler registry coverage checks pass for this node.
- [ ] Observability and regression checks reviewed post-rollout.

## Notes

- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.

