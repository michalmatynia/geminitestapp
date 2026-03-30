---
owner: 'Platform Operations'
last_reviewed: '2026-03-28'
status: 'active'
doc_type: 'runbook'
scope: 'cross-feature'
canonical: true
---

# Testing Operations

This runbook explains how to execute the canonical testing lanes, refresh
generated testing artifacts, and record major runs in the ledger.

Policy lives in
[`docs/platform/testing-policy.md`](../platform/testing-policy.md). This file is
the operator procedure layer.

## Core Commands

### Inspect registry

- `npm run test:lane -- --list`
- `npm run metrics:test-suite-inventory`

### Run canonical lanes

- `npm run test:lane:local-fast`
- `npm run test:lane:pr-required`
- `npm run test:lane:nightly-deep`
- `npm run test:lane:weekly-audit`
- `npm run test:lane:release-gate`

Current CI-backed major lanes:

- `pr-required` via [`.github/workflows/test-matrix.yml`](../../.github/workflows/test-matrix.yml)
- `nightly-deep` via [`.github/workflows/nightly-deep-tests.yml`](../../.github/workflows/nightly-deep-tests.yml)
- `weekly-audit` via [`.github/workflows/weekly-quality-report.yml`](../../.github/workflows/weekly-quality-report.yml)

### Record a manual major run

- `npm run testing:record -- --label="Manual release validation" --status=ok --suite=build --suite=e2e --note="Smoke checked before Friday deploy"`

### Initialize or refresh stable ledger docs

- `npm run metrics:test-run-ledger`

## What The Lane Runner Does

The lane runner:

- resolves suites from the canonical registry
- executes suites sequentially
- preserves structured scanner output for summary-json capable suites
- auto-records major lanes in the testing run ledger
- shares the same ledger surface that CI major-lane equivalents should publish
  as artifacts

Use ad hoc suite selection when you need a narrower run:

- `npm run test:lane -- --suite=critical-flows --suite=security-smoke`

## Generated Testing Docs

- Suite inventory:
  [`docs/metrics/testing-suite-inventory-latest.md`](../metrics/testing-suite-inventory-latest.md)
- Run ledger:
  [`docs/metrics/testing-run-ledger-latest.md`](../metrics/testing-run-ledger-latest.md)
- Quality snapshot:
  [`docs/metrics/testing-quality-snapshot-latest.md`](../metrics/testing-quality-snapshot-latest.md)

In CI, treat uploaded `testing-run-ledger-latest.*` artifacts as the canonical
record for that lane run when the job workspace is ephemeral.

## Recording Expectations

Record any major test run that affects merge, release, or incident confidence.

Examples:

- a PR validation sweep across multiple suites
- a release-candidate build + e2e pass
- a nightly deep lane
- a weekly audit lane
- a manual broad regression run driven by an AI agent

Do not record trivial single-test-file reruns unless they are part of a larger
documented validation pass.

## Recommended Entry Template

When using `npm run testing:record`, capture:

- `--label`: short human-readable run name
- `--status`: `ok`, `warn`, or `failed`
- `--lane`: when the run maps to a canonical lane
- `--suite`: when the run is manual or partial
- `--duration-ms`: when known
- `--artifact`: generated report paths
- `--note`: important follow-up, scope, or exceptions

## Operational Rules

- Prefer canonical lanes before inventing temporary command bundles.
- Prefer `*-latest.*` outputs over timestamped historical files when reviewing
  the current state.
- Only write historical snapshots intentionally with `--write-history`.
- If a major run fails because of environment drift, record the failure and the
  blocking condition instead of silently omitting the ledger entry.
