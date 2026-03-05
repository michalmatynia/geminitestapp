# Step 25 Execution: Accessibility Warning Budget Enforcement Decision

Date: 2026-03-05

## Objective

Finalize policy for accessibility warning budgets by keeping default telemetry behavior while enabling an explicit strict fail mode.

## Implemented Artifacts

- Updated `scripts/testing/run-accessibility-smoke-tests.mjs`:
  - Added flag: `--fail-on-warning-budget-exceed`
  - Added summary field:
    - `warningBudgetEnforcement` (`telemetry-only` or `fail-on-exceed`)
  - Added payload field:
    - `failOnWarningBudgetExceed`
  - Markdown report now includes `Warning budget enforcement`.
  - Strict-mode exit behavior now supports optional warning-budget enforcement:
    - existing strict failure on suite failures remains unchanged
    - additional strict failure when:
      - `--fail-on-warning-budget-exceed` is enabled
      - warning budget status is `exceeded`
- Refreshed reports:
  - `docs/metrics/accessibility-smoke-latest.json`
  - `docs/metrics/accessibility-smoke-latest.md`
  - `docs/metrics/accessibility-smoke-2026-03-05T05-02-24-992Z.json`
  - `docs/metrics/accessibility-smoke-2026-03-05T05-02-24-992Z.md`

## Validation

- `node scripts/testing/run-accessibility-smoke-tests.mjs --strict --ci --no-history --warning-budget=10`: pass (`5/5`, warnings=`1`, status=`ok`)
- `node scripts/testing/run-accessibility-smoke-tests.mjs --strict --ci --no-history --warning-budget=0 --fail-on-warning-budget-exceed`: fail (expected; warning budget exceeded)
- `node scripts/testing/run-accessibility-smoke-tests.mjs --warning-budget=10`: pass (`5/5`, history written)
- `node --check scripts/testing/run-accessibility-smoke-tests.mjs`: pass

## Decision

- Default behavior remains non-failing telemetry for warning budgets.
- Strict fail-on-exceed is now available as an explicit opt-in for future CI promotion.
