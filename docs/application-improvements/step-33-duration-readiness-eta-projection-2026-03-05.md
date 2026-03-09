---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 33 Execution: Duration Readiness ETA Projection

Date: 2026-03-05

## Objective

Add a simple, explicit ETA projection for weekly duration-recalibration readiness so backlog pacing is visible in artifacts and CI summaries.

## Implemented Artifacts

- Updated `scripts/quality/recalibrate-weekly-duration-budgets.mjs`:
  - Added cadence metadata to summary payload:
    - `weeklyCadenceDays`
    - `estimatedReadyDateWeeklyCadence`
  - ETA projection is derived from:
    - latest weekly run timestamp (`summary.newestRun`)
    - `requiredRunsNeeded`
    - fixed weekly cadence (`7` days)
  - Extended markdown output to include the estimated readiness date line.
- Updated `.github/workflows/weekly-quality-report.yml`:
  - Extended the duration readiness section in `GITHUB_STEP_SUMMARY` to include:
    - estimated readiness date
    - cadence used for the estimate
- Refreshed reports:
  - `docs/metrics/weekly-duration-budget-recommendations-latest.json`
  - `docs/metrics/weekly-duration-budget-recommendations-latest.md`
  - `docs/metrics/weekly-duration-budget-recommendations-2026-03-05T05-33-34-265Z.json`
  - `docs/metrics/weekly-duration-budget-recommendations-2026-03-05T05-33-34-265Z.md`

## Validation

- `node --check scripts/quality/recalibrate-weekly-duration-budgets.mjs`: pass
- `node scripts/quality/recalibrate-weekly-duration-budgets.mjs --apply-budgets --ci --no-history`: pass
- `node scripts/quality/recalibrate-weekly-duration-budgets.mjs --apply-budgets`: pass (history emitted)

## Current Impact

- Required readiness still pending with minimum additional runs: `8`
- Current blockers remain:
  - `build`
  - `lint`
- Estimated readiness date at weekly cadence:
  - `2026-04-30T03:11:43.736Z`

## Notes

- ETA is a pacing projection, not a guarantee; missed or failing weekly runs delay the estimate.
