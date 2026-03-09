---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 34 Execution: Duration Readiness Cadence Override

Date: 2026-03-05

## Objective

Make readiness ETA projection adaptable to non-weekly operating cadence without changing code.

## Implemented Artifacts

- Updated `scripts/quality/recalibrate-weekly-duration-budgets.mjs`:
  - Added CLI override:
    - `--cadence-days=<n>`
  - Added argument validation:
    - invalid/non-positive values fall back to default (`7`)
  - Updated ETA computation to use configured cadence days.
  - Persisted configured cadence in summary payload via:
    - `weeklyCadenceDays`
  - Markdown summary now renders cadence from payload/defaulted runtime setting.
- Refreshed reports:
  - `docs/metrics/weekly-duration-budget-recommendations-latest.json`
  - `docs/metrics/weekly-duration-budget-recommendations-latest.md`
  - `docs/metrics/weekly-duration-budget-recommendations-2026-03-05T05-36-41-763Z.json`
  - `docs/metrics/weekly-duration-budget-recommendations-2026-03-05T05-36-41-763Z.md`

## Validation

- `node --check scripts/quality/recalibrate-weekly-duration-budgets.mjs`: pass
- `node scripts/quality/recalibrate-weekly-duration-budgets.mjs --apply-budgets --ci --no-history`: pass
- `node scripts/quality/recalibrate-weekly-duration-budgets.mjs --apply-budgets`: pass (history emitted)

## Current Impact

- ETA projection remains:
  - `2026-04-30T03:11:43.736Z` at 7-day cadence
- Projection can now be tuned for alternate execution schedules without patching source.

## Notes

- The cadence override only affects ETA projection metadata; it does not alter readiness thresholds, sample ingestion, or budget-application gating.
