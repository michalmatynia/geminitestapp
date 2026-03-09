---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 29 Execution: Duration Readiness Required-vs-Optional Model

Date: 2026-03-05

## Objective

Fix recalibration readiness semantics so optional weekly checks (`fullUnit`, `e2e`) do not block budget application readiness forever.

## Implemented Artifacts

- Updated `scripts/quality/recalibrate-weekly-duration-budgets.mjs`:
  - Added readiness metadata per check (`requiredForReadiness`).
  - Marked `fullUnit` and `e2e` as optional for readiness gating.
  - Added per-check sample gap tracking (`samplesNeeded`).
  - Added expanded summary fields:
    - `checksRequired`, `checksOptional`
    - `checksReadyRequired`, `checksPendingRequired`
    - `checksOptionalNoSamples`
  - Updated status logic:
    - overall `ready/partial/pending` now computed from required checks only
    - optional checks with no samples are reported as `optional` instead of blocking readiness
  - Extended markdown and console output with required-vs-optional progress.
- Refreshed reports:
  - `docs/metrics/weekly-duration-budget-recommendations-latest.json`
  - `docs/metrics/weekly-duration-budget-recommendations-latest.md`
  - `docs/metrics/weekly-duration-budget-recommendations-2026-03-05T05-22-09-009Z.json`
  - `docs/metrics/weekly-duration-budget-recommendations-2026-03-05T05-22-09-009Z.md`

## Validation

- `node --check scripts/quality/recalibrate-weekly-duration-budgets.mjs`: pass
- `node scripts/quality/recalibrate-weekly-duration-budgets.mjs --apply-budgets --ci --no-history`: pass
  - current status: `pending`
  - readiness progress: `readyRequired=0/10`, `readyAll=0/12`
  - apply status: `skipped` (as expected)
- `node scripts/quality/recalibrate-weekly-duration-budgets.mjs --apply-budgets`: pass (history emitted)

## Notes

- This resolves the structural blocker where optional checks could keep recalibration non-ready indefinitely.
