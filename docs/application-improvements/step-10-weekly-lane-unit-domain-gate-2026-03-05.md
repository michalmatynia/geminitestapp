---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 10 Execution: Weekly Lane Unit-Domain Gate

Date: 2026-03-05

## Objective

Integrate the deterministic unit-domain suite into the weekly quality baseline lane so drift is visible in one report.

## Implemented Artifacts

- Script update: `scripts/quality/generate-weekly-report.mjs`
  - Added `Unit Domain Gate` check:
    - command: `npm run test:unit:domains:strict -- --ci --no-history`
    - timeout: `25m`
  - Added baseline status line:
    - `Unit-domain gate pass rate`
  - Added pass-rate field in JSON payload:
    - `report.passRates.unitDomains`

## Validation

- Syntax check:
  - `node --check scripts/quality/generate-weekly-report.mjs`
  - Result: pass
- Gate reference validation:
  - `node scripts/testing/run-unit-domain-timings.mjs --strict --ci --no-history`
  - Result: pass (`5/5` domains, latest report green)

## Notes

- Full `quality:weekly-report` execution was not rerun in this step because it includes build/lint/typecheck plus long-running suites; this change is isolated to check registration and report serialization.
