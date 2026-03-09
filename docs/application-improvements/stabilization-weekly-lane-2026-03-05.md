---
owner: 'Platform Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'plan'
scope: 'cross-feature'
canonical: true
---

# Weekly Baseline Lane Stabilization

Date: 2026-03-05

## Objective

Reduce baseline runtime volatility by defaulting weekly quality reporting to deterministic domain gates instead of full unit test execution.

## Change

Updated `scripts/quality/generate-weekly-report.mjs`:

- Added dedicated checks:
  - `Critical Flow Gate` (`test:critical-flows:strict -- --ci --no-history`)
  - `Security Smoke Gate` (`test:security-smoke:strict -- --ci --no-history`)
- Made full unit suite optional via `--include-full-unit`.
- Added explicit report rows for:
  - critical-flow gate pass rate
  - security smoke gate pass rate
  - full unit pass rate

## Validation

Run: `node scripts/quality/generate-weekly-report.mjs --ci --no-history`

Observed:

- Critical Flow Gate: PASS
- Security Smoke Gate: PASS
- Full Unit Tests: SKIPPED (expected default)

This preserves high-signal baseline checks while avoiding long, noisy full-unit default runs.
