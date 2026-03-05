# Step 27 Execution: Weekly Lint Test-Tree Promotion

Date: 2026-03-05

## Objective

Promote stabilized lint-domain full test-tree mode into the default weekly strict quality lane.

## Implemented Artifacts

- Updated `scripts/quality/generate-weekly-report.mjs`:
  - Weekly lint-domain check now runs:
    - `node scripts/quality/run-lint-domain-checks.mjs --include-test-tree --strict --ci --no-history`

## Validation

- `node scripts/quality/run-lint-domain-checks.mjs --include-test-tree --strict --ci --no-history`: pass (`5/5`)
- `node --check scripts/quality/generate-weekly-report.mjs`: pass

## Notes

- Full weekly report execution is intentionally not re-run in this step because build/typecheck/lint baseline failures in the current workspace are unrelated to this lint-domain promotion change.
