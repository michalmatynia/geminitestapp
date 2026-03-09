---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 17 Execution: Critical Path Branch Guardrails

Date: 2026-03-05

## Objective

Expand critical-path guardrails from LOC-only budgets to include API route branch-complexity heuristics.

## Implemented Artifacts

- Updated `scripts/perf/check-critical-path-performance.mjs`:
  - Added API route `maxBranchPoints` budgets for the five critical flows.
  - Added static branch-point counting (`if`, `switch`, `case`, `catch`, `for`, `while`).
  - Added fail condition when branch points exceed budget.
  - Extended console and markdown output with branch metrics.
  - Extended file breakdown with per-file branch-point counts.
- Refreshed reports:
  - `docs/metrics/critical-path-performance-latest.json`
  - `docs/metrics/critical-path-performance-latest.md`
  - `docs/metrics/critical-path-performance-2026-03-05T04-28-02-774Z.json`
  - `docs/metrics/critical-path-performance-2026-03-05T04-28-02-774Z.md`

## Validation

- `node scripts/perf/check-critical-path-performance.mjs --strict --ci --no-history`: pass (`10/10`)
- `node scripts/perf/check-critical-path-performance.mjs`: pass (`10/10`, history written)

## Current Baseline Snapshot

- Auth API: `10/14` branch points (pass)
- Products API: `10/14` branch points (pass)
- Image Studio API: `85/95` branch points (pass)
- AI Paths API: `15/22` branch points (pass)
- Case Resolver API: `11/15` branch points (pass)
