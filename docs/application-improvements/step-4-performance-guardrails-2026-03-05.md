# Step 4 Execution: Performance Optimization Guardrails

Date: 2026-03-05

## Objective

Introduce a lightweight, repeatable performance gate for the five critical application paths so page complexity drift is visible and enforceable in CI.

## Implemented Artifacts

- Script: `scripts/perf/check-critical-path-performance.mjs`
- NPM scripts:
  - `npm run metrics:critical-paths`
  - `npm run metrics:critical-paths:check`
- CI integration:
  - `.github/workflows/architecture-guardrails.yml`
  - Added step: `npm run metrics:critical-paths:check -- --ci`
- Reports:
  - `docs/metrics/critical-path-performance-latest.json`
  - `docs/metrics/critical-path-performance-latest.md`
  - `docs/metrics/critical-path-performance-2026-03-05T02-58-19-950Z.json`
  - `docs/metrics/critical-path-performance-2026-03-05T02-58-19-950Z.md`

## Current Budget Snapshot

- Authentication + Session Bootstrap: `183 / 220 LOC` (PASS)
- Products CRUD + Listing Refresh: `43 / 80 LOC` (PASS)
- Image Studio Generate + Preview: `311 / 360 LOC` (PASS)
- AI Paths Run Execution: `84 / 120 LOC` (PASS)
- Case Resolver OCR + Capture Mapping: `28 / 60 LOC` (PASS)

## Validation

- `node scripts/perf/check-critical-path-performance.mjs`: pass
- `node scripts/perf/check-critical-path-performance.mjs --strict --ci --no-history`: pass
