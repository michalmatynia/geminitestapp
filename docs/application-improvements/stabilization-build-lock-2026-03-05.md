# Baseline Build Lock Stabilization

Date: 2026-03-05

## Objective

Prevent weekly baseline runs from failing due to `.next/lock` contention when another `next build` process is already active.

## Change

Updated `scripts/quality/generate-weekly-report.mjs` build preflight to:

1. Detect `.next/lock`.
2. Check active processes for `next build` in the same workspace.
3. If active build is found, mark the build check as `SKIPPED` with explicit reason.
4. If no active build is found, remove stale `.next/lock` and proceed.

## Verification

- Command: `node scripts/quality/generate-weekly-report.mjs --ci --no-history`
- Observed first check: `Build SKIPPED 0ms` when concurrent builds were active.

This keeps baseline reporting stable without force-killing running builds.
