---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 32 Execution: Duration Supplemental Sample Ingestion

Date: 2026-03-05

## Objective

Reduce readiness blind spots by supplementing weekly-run samples with compatible historical check artifacts.

## Implemented Artifacts

- Updated `scripts/quality/recalibrate-weekly-duration-budgets.mjs`:
  - Added supplemental sample ingestion (enabled by default; disable with `--no-supplemental-samples`) for:
    - `lintDomains` from `lint-domain-checks-*.json` (excluding trend files)
    - `unitDomains` from `unit-domain-timings-*.json` (excluding trend files)
    - `criticalFlows` from `critical-flow-tests-*.json`
    - `securitySmoke` from `security-smoke-*.json`
  - Added per-check sample source fields:
    - `sampleCountWeekly`
    - `sampleCountSupplemental`
    - `sampleCount`
  - Added summary/source telemetry:
    - `samplesWeekly`, `samplesSupplemental`, `samplesTotal`
    - `supplementalSamplesEnabled`
    - top-level `supplemental.byCheck`
  - Updated markdown table to show weekly vs supplemental counts.
- Refreshed reports:
  - `docs/metrics/weekly-duration-budget-recommendations-latest.json`
  - `docs/metrics/weekly-duration-budget-recommendations-latest.md`
  - `docs/metrics/weekly-duration-budget-recommendations-2026-03-05T05-30-02-921Z.json`
  - `docs/metrics/weekly-duration-budget-recommendations-2026-03-05T05-30-02-921Z.md`

## Validation

- `node --check scripts/quality/recalibrate-weekly-duration-budgets.mjs`: pass
- `node scripts/quality/recalibrate-weekly-duration-budgets.mjs --apply-budgets --ci --no-history`: pass
- `node scripts/quality/recalibrate-weekly-duration-budgets.mjs --apply-budgets`: pass (history emitted)

## Current Impact

- Sample totals improved to:
  - weekly: `8`
  - supplemental: `9`
  - combined: `17`
- Required blocker set narrowed to:
  - `build`
  - `lint`
- Minimum required passing runs still needed: `8`

## Notes

- This step preserves conservative readiness thresholds while using already-generated domain/smoke artifacts to improve calibration confidence.
