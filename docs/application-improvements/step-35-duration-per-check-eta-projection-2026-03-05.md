# Step 35 Execution: Duration Per-Check ETA Projection

Date: 2026-03-05

## Objective

Improve recalibration triage by projecting readiness ETA at the individual check level, not only as a single top-level value.

## Implemented Artifacts

- Updated `scripts/quality/recalibrate-weekly-duration-budgets.mjs`:
  - Added helper constant:
    - `MILLIS_PER_DAY`
  - Added per-entry projection field:
    - `estimatedReadyDateWeeklyCadence`
  - Projection uses:
    - newest observed weekly run timestamp
    - per-check `samplesNeeded`
    - configured cadence (`--cadence-days`, default `7`)
  - Optional checks with no samples (`status=optional`) emit no ETA.
  - Recommendation markdown table now includes an `ETA` column.
- Refreshed reports:
  - `docs/metrics/weekly-duration-budget-recommendations-latest.json`
  - `docs/metrics/weekly-duration-budget-recommendations-latest.md`
  - `docs/metrics/weekly-duration-budget-recommendations-2026-03-05T05-38-20-935Z.json`
  - `docs/metrics/weekly-duration-budget-recommendations-2026-03-05T05-38-20-935Z.md`

## Validation

- `node --check scripts/quality/recalibrate-weekly-duration-budgets.mjs`: pass
- `node scripts/quality/recalibrate-weekly-duration-budgets.mjs --apply-budgets --ci --no-history`: pass
- `node scripts/quality/recalibrate-weekly-duration-budgets.mjs --apply-budgets`: pass (history emitted)

## Current Impact

- Recommendation table now surfaces staged readiness pacing by check:
  - earliest required ETA in current snapshot: `criticalFlows` (`2026-04-02T03:11:43.736Z`)
  - latest blocking required ETA: `build`/`lint` (`2026-04-30T03:11:43.736Z`)
- Top-level readiness ETA remains unchanged:
  - `2026-04-30T03:11:43.736Z`

## Notes

- Per-check ETA is intended for prioritization only; readiness still depends on real pass results and minimum-sample thresholds.
