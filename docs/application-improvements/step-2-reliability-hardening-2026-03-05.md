# Step 2 Execution: Reliability and Test Hardening

Date: 2026-03-05

## Objective

Add a stable regression gate mapped to the top 5 business-critical user flows so reliability regressions are detected quickly and reported consistently.

## Implemented Artifacts

- Runner: `scripts/testing/run-critical-flow-tests.mjs`
- NPM scripts:
  - `npm run test:critical-flows`
  - `npm run test:critical-flows:strict`
- CI integration: `.github/workflows/test-matrix.yml` job `critical-flows`
- Generated reports:
  - `docs/metrics/critical-flow-tests-latest.json`
  - `docs/metrics/critical-flow-tests-latest.md`
  - `docs/metrics/critical-flow-tests-<timestamp>.json`
  - `docs/metrics/critical-flow-tests-<timestamp>.md`

## Flow-to-Test Mapping

| Priority | Flow | Test |
| ---: | --- | --- |
| 1 | Authentication + Session Bootstrap | `__tests__/features/auth/pages/signin-page.test.tsx` |
| 2 | Products CRUD + Listing Refresh | `__tests__/features/products/services/getSettingValue.test.ts` |
| 3 | Image Studio Generate + Preview | `src/features/ai/image-studio/utils/__tests__/studio-settings.test.ts` |
| 4 | AI Paths Run Execution | `__tests__/features/ai/ai-paths/services/path-run-executor.test.ts` |
| 5 | Case Resolver OCR + Capture Mapping | `src/features/case-resolver/__tests__/workspace-persistence.test.ts` |

## Local Execution

```bash
npm run test:critical-flows
```

Strict mode (non-zero exit on failures):

```bash
npm run test:critical-flows:strict
```

## Current Result

- Latest run: `pass=5, fail=0, total=5`
- Report timestamp: `2026-03-05T00:46:55.567Z`
