# Step 23 Execution: Weekly Duration Recalibration Automation

Date: 2026-03-05

## Objective

Operationalize weekly duration budget recalibration so budget updates can be made from historical evidence instead of manual guesses.

## Implemented Artifacts

- Added `scripts/quality/recalibrate-weekly-duration-budgets.mjs`:
  - Reads weekly run history from `docs/metrics/weekly-quality-*.json` (+ latest by default).
  - Evaluates pass-duration samples for all 12 weekly checks.
  - Computes recommendation readiness based on:
    - minimum pass samples (default `8`)
    - percentile target (default `90th`)
    - safety headroom (default `20%`)
  - Emits recommendation payload + markdown report:
    - `docs/metrics/weekly-duration-budget-recommendations-latest.json`
    - `docs/metrics/weekly-duration-budget-recommendations-latest.md`
    - timestamped historical snapshots (non-CI mode)
- Added npm scripts:
  - `npm run quality:weekly-duration-budgets`
  - `npm run quality:weekly-duration-budgets:ci`
- Updated weekly workflow `.github/workflows/weekly-quality-report.yml`:
  - added `Generate weekly duration budget recommendations` (`if: always()`)
  - uploads recommendation artifacts in `trend-index-report`
  - lists recommendation files in `$GITHUB_STEP_SUMMARY`

## Validation

- `node scripts/quality/recalibrate-weekly-duration-budgets.mjs`: pass
- `node scripts/quality/recalibrate-weekly-duration-budgets.mjs --ci --no-history`: pass
- `node --check scripts/quality/recalibrate-weekly-duration-budgets.mjs`: pass

## Current Calibration Result

- Status: `pending`
- Runs analyzed: `2`
- Ready checks: `0/12`
- Recommendation deltas: `0` (insufficient data threshold not met yet)

## Notes

- This step automates calibration readiness and evidence collection; applying budget deltas remains intentionally manual until sufficient history accumulates.
