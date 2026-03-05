# Step 14 Execution: Weekly Duration Budgets

Date: 2026-03-05

## Objective

Set explicit per-check duration budgets in weekly quality reporting and enforce alert thresholds in strict mode.

## Implemented Artifacts

- Updated `scripts/quality/generate-weekly-report.mjs`:
  - Added duration budget map (`DURATION_ALERT_BUDGETS_MS`) for weekly checks:
    - `build`: `3m`
    - `lint`: `4m`
    - `lintDomains`: `3m`
    - `typecheck`: `2m`
    - `criticalFlows`: `1m`
    - `securitySmoke`: `1m`
    - `unitDomains`: `10m`
    - `fullUnit`: `25m`
    - `e2e`: `40m`
    - `guardrails`: `1m`
    - `uiConsolidation`: `1m`
    - `observability`: `30s`
  - Added computed `durationAlerts` payload section.
  - Added markdown section: `Duration Budget Alerts`.
  - Added baseline status line: `Duration budget alerts`.
  - Strict mode now fails when any duration budget alert is present.

## Validation

- `node --check scripts/quality/generate-weekly-report.mjs`: pass

## Notes

- Full weekly report run was not executed in this step because it includes heavy build/lint/typecheck/e2e paths; this change is isolated to budget evaluation and serialization logic.
