## Summary

Describe the change in 3-6 bullets.

## AI-Paths Kernel Migration Impact

- Node types touched:
- Runtime strategy changes (`legacy_adapter` -> `code_object_v3`):
- Migration wave (`pilot` / `backlog`):
- Portable engine import/export impact:

## Required Evidence (AI-Paths)

- [ ] `npx tsc`
- [ ] `npm run ai-paths:check:canonical`
- [ ] `npm run test:ai-paths:v3-pilot-parity` (if pilot/v3 behavior changed)
- [ ] `npm run docs:ai-paths:node-migration:check` (if node docs/contracts changed)

Paste short outputs for each command above.

## Readiness Scorecard Delta

- Readiness stages changed:
- Top blockers reduced/introduced:
- Migration index/guide updated:

## Rollout and Safety

- Runtime kill switch path (`runtimeKernelMode=legacy_only`):
- Canary scope:
- Rollback steps:
- Monitoring/alerts to watch:

## Risk Review

- [ ] No behavior change (refactor-only), or behavior change is explicitly tested.
- [ ] Backward compatibility for stored path configs is preserved.
- [ ] Error handling and dead-letter behavior were considered.
