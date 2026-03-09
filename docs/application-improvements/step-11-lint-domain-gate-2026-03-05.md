---
owner: "Platform Team"
last_reviewed: "2026-03-09"
status: "active"
doc_type: "plan"
scope: "cross-feature"
canonical: true
---
# Step 11 Execution: Lint Domain Gate

Date: 2026-03-05

## Objective

Replace fragile single-run lint sweeps with a deterministic domain-split lint gate and report output.

## Implemented Artifacts

- New runner: `scripts/quality/run-lint-domain-checks.mjs`
  - Domain chunks: `auth`, `products`, `ai-paths`, `image-studio`, `case-resolver`
  - Outputs:
    - `docs/metrics/lint-domain-checks-latest.json`
    - `docs/metrics/lint-domain-checks-latest.md`
    - timestamped history files
- Weekly lane integration: `scripts/quality/generate-weekly-report.mjs`
  - Added check: `Lint Domain Gate`
  - Added pass-rate field: `lintDomains`
  - Added baseline line: `Lint-domain pass rate`
- AI Paths lint fix:
  - `src/app/api/ai-paths/portable-engine/schema/diff/handler.ts`
  - Fixed indentation and removed unnecessary type assertions to clear domain lint errors.

## Validation

- `node scripts/quality/run-lint-domain-checks.mjs --strict --ci --no-history`: pass (`5/5` domains)
- `node scripts/quality/run-lint-domain-checks.mjs`: pass (`5/5` domains), history report emitted
- `node --check scripts/quality/run-lint-domain-checks.mjs`: pass
- `node --check scripts/quality/generate-weekly-report.mjs`: pass

## Current Baseline Snapshot

- Latest lint-domain report generated at `2026-03-05T04:06:33.027Z`
- Domain durations:
  - Auth: `11.1s` (pass)
  - Products: `22.6s` (pass)
  - AI Paths: `23.7s` (pass)
  - Image Studio: `21.6s` (pass)
  - Case Resolver: `20.3s` (pass)
