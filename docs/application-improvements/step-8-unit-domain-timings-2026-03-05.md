# Step 8 Execution: Unit Domain Timing Split

Date: 2026-03-05

## Objective

Split the unit lane into deterministic domain suites with per-domain duration reporting, then enforce that gate in CI.

## Implemented Artifacts

- Script: `scripts/testing/run-unit-domain-timings.mjs`
- NPM scripts:
  - `npm run test:unit:domains`
  - `npm run test:unit:domains:strict`
- CI integration:
  - `.github/workflows/test-matrix.yml`
  - Added job: `unit-domain-timings`
- Reports:
  - `docs/metrics/unit-domain-timings-latest.json`
  - `docs/metrics/unit-domain-timings-latest.md`
  - `docs/metrics/unit-domain-timings-2026-03-05T03-33-16-314Z.json`
  - `docs/metrics/unit-domain-timings-2026-03-05T03-33-16-314Z.md`

## Domain Mapping

| Domain | Filters |
| --- | --- |
| Auth | `__tests__/features/auth`, `__tests__/api/auth`, `src/features/auth` |
| Products | `__tests__/features/products`, `__tests__/api/products`, `src/features/products`, `__tests__/shared/contracts/products-contracts.test.ts` |
| AI Paths | `__tests__/features/ai/ai-paths`, `__tests__/api/ai-paths`, `__tests__/api/ai-paths-`, `src/features/ai/ai-paths` |
| Image Studio | `__tests__/features/ai/image-studio`, `src/features/ai/image-studio` |
| Case Resolver | `src/features/case-resolver`, `src/features/case-resolver-capture`, `__tests__/features/case-resolver-capture`, `src/features/prompt-exploder/__tests__/case-resolver` |

## Validation

- `node scripts/testing/run-unit-domain-timings.mjs`: pass for runner execution (`4/5` passing domains, reports emitted with history)
- `node scripts/testing/run-unit-domain-timings.mjs --strict --ci --no-history`: fail as expected (`exit 1`) because Products domain currently fails baseline tests:
  - `__tests__/features/products/validations/middleware.test.ts`:
    - `passes repeated keys as arrays to update validator`
    - `passes repeated keys as arrays to create validator`
  - `__tests__/features/products/utils/validator-regex-safety.test.ts`:
    - unresolved import `@/shared/lib/products/utils/validator-regex-safety`

## Current Baseline Snapshot

- Latest strict report generated at `2026-03-05T03:42:06.942Z`
- Domain durations (strict run):
  - Auth: `21.6s` (pass)
  - Products: `185.2s` (fail)
  - AI Paths: `202.2s` (pass)
  - Image Studio: `34.8s` (pass)
  - Case Resolver: `70.9s` (pass)
