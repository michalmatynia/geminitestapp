---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 20 Execution: Accessibility Warning Budget Telemetry

Date: 2026-03-05

## Objective

Add a lightweight, non-failing warning budget to accessibility smoke reporting to track recurring React `act(...)` warnings.

## Implemented Artifacts

- Updated `scripts/testing/run-accessibility-smoke-tests.mjs`:
  - Added warning budget support:
    - CLI arg: `--warning-budget=<n>` (default `10`)
  - Added React `act(...)` warning detection from suite output.
  - Added summary fields:
    - `actWarnings`
    - `warningBudget`
    - `warningBudgetStatus` (`ok` / `exceeded`)
  - Added markdown section:
    - `Warning Details` per suite
  - Kept behavior non-failing for warnings (strict mode still fails only on suite failures).
- Refreshed reports:
  - `docs/metrics/accessibility-smoke-latest.json`
  - `docs/metrics/accessibility-smoke-latest.md`
  - `docs/metrics/accessibility-smoke-2026-03-05T04-38-51-223Z.json`
  - `docs/metrics/accessibility-smoke-2026-03-05T04-38-51-223Z.md`

## Validation

- `node scripts/testing/run-accessibility-smoke-tests.mjs --strict --ci --no-history --warning-budget=10`: pass (`5/5`, warnings=`1`, status=`ok`)
- `node scripts/testing/run-accessibility-smoke-tests.mjs --warning-budget=10`: pass (`5/5`, history written)

## Notes

- This budget is telemetry only by design to avoid destabilizing accessibility gates while warning remediation is in progress.
