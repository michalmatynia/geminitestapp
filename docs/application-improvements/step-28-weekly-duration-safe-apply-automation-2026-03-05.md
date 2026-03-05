# Step 28 Execution: Weekly Duration Safe-Apply Automation

Date: 2026-03-05

## Objective

Remove manual friction from weekly duration budget adoption by adding a safe apply mode that updates budget constants only when calibration is fully ready.

## Implemented Artifacts

- Updated `scripts/quality/recalibrate-weekly-duration-budgets.mjs`:
  - Added `--apply-budgets` mode.
  - Added guarded application flow:
    - applies only when calibration status is `ready` (all checks ready)
    - skips with explicit reason for `pending`/`partial`
    - reports `no-change` when recommendations match current budgets
  - Added structured `application` payload block with:
    - `requested`, `status`, `applied`, `targetFile`, `reason`, `changedChecks`
  - Added summary field:
    - `applicationStatus`
  - Added markdown `Application` section describing apply outcome.
  - Added robust replacement logic targeting `DURATION_ALERT_BUDGETS_MS` block in:
    - `scripts/quality/generate-weekly-report.mjs`
- Refreshed reports:
  - `docs/metrics/weekly-duration-budget-recommendations-latest.json`
  - `docs/metrics/weekly-duration-budget-recommendations-latest.md`
  - `docs/metrics/weekly-duration-budget-recommendations-2026-03-05T05-18-41-598Z.json`
  - `docs/metrics/weekly-duration-budget-recommendations-2026-03-05T05-18-41-598Z.md`

## Validation

- `node --check scripts/quality/recalibrate-weekly-duration-budgets.mjs`: pass
- `node scripts/quality/recalibrate-weekly-duration-budgets.mjs --apply-budgets`: pass
  - current result: `apply=skipped` (status `pending`, insufficient samples)
- `node scripts/quality/recalibrate-weekly-duration-budgets.mjs --apply-budgets --ci --no-history`: pass

## Notes

- This step does not force budget changes early; it only automates safe adoption once data depth reaches readiness.
