---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 30 Execution: Duration Readiness Gap Estimator

Date: 2026-03-05

## Objective

Make weekly duration recalibration backlog execution measurable by exposing how many additional passing runs are needed and which checks currently block readiness.

## Implemented Artifacts

- Updated `scripts/quality/recalibrate-weekly-duration-budgets.mjs`:
  - Added summary gap estimator fields:
    - `requiredRunsNeeded`
    - `blockingChecks`
  - Added markdown visibility for:
    - required vs optional check counts
    - minimum additional passing runs needed
    - active blocking check IDs
  - Added per-check `samplesNeeded` tracking to recommendation rows.
- Refreshed reports:
  - `docs/metrics/weekly-duration-budget-recommendations-latest.json`
  - `docs/metrics/weekly-duration-budget-recommendations-latest.md`
  - `docs/metrics/weekly-duration-budget-recommendations-2026-03-05T05-23-21-216Z.json`
  - `docs/metrics/weekly-duration-budget-recommendations-2026-03-05T05-23-21-216Z.md`

## Validation

- `node --check scripts/quality/recalibrate-weekly-duration-budgets.mjs`: pass
- `node scripts/quality/recalibrate-weekly-duration-budgets.mjs --apply-budgets --ci --no-history`: pass
- `node scripts/quality/recalibrate-weekly-duration-budgets.mjs --apply-budgets`: pass (history emitted)

## Current Gap Snapshot

- Required readiness progress: `0/10`
- Minimum additional passing runs needed: `8`
- Current blocking checks: `build`, `lint`, `lintDomains`, `unitDomains`

## Notes

- This estimator gives a concrete trigger for when to rerun `--apply-budgets` with a realistic chance of applying updates.
