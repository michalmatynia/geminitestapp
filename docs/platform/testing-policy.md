---
owner: 'Platform Team'
last_reviewed: '2026-03-28'
status: 'active'
doc_type: 'policy'
scope: 'repo'
canonical: true
---

# Testing Policy

This policy defines the canonical test lanes, when they run, and what must be
documented after larger executions.

The source of truth for suite and lane membership is
[`scripts/testing/config/test-suite-registry.mjs`](../../scripts/testing/config/test-suite-registry.mjs).
Docs and workflows should follow that registry instead of copying suite lists by
hand.

## Policy Goals

- keep fast confidence checks available during active implementation
- keep pull-request gates predictable and bounded
- push expensive regression breadth into nightly and weekly lanes
- maintain a stable written record of major test runs and their outcomes
- make AI-agent validation work auditable instead of leaving results only in chat

## Canonical Lanes

| Lane | Purpose | When to run | Ledger update |
| --- | --- | --- | --- |
| `local-fast` | Fast local confidence before or during edits | local, on demand | optional |
| `pr-required` | Minimum blocking merge confidence | every PR / merge candidate | required |
| `nightly-deep` | Broader regression and exploratory confidence | nightly or large refactor windows | required |
| `weekly-audit` | Quality reporting, drift checks, and trends | weekly cadence | required |
| `release-gate` | Highest-confidence shipping lane | pre-release / promotion | required |

## Lane Commands

- `npm run test:lane:local-fast`
- `npm run test:lane:pr-required`
- `npm run test:lane:nightly-deep`
- `npm run test:lane:weekly-audit`
- `npm run test:lane:release-gate`

Use `npm run test:lane -- --list` to inspect the current registry.

## Required Behaviors

### Pull requests

- Must pass the `pr-required` lane or an approved equivalent CI execution.
- If a change bypasses a suite because it is infrastructure-blocked, record that
  explicitly in the test ledger entry notes.
- CI should publish a stable `pr-required` ledger artifact so merge confidence is
  auditable even when the run is not executed through the local lane runner.

### Nightly and weekly

- Deep and audit lanes should write stable artifacts under
  [`docs/metrics/`](../metrics/README.md).
- CI should schedule the canonical `nightly-deep` lane directly instead of
  rebuilding its suite membership ad hoc in workflows.
- Generated outputs should refresh `*-latest.*` aliases first and only write
  timestamped history when explicitly requested.

### Releases

- Use the `release-gate` lane before production promotions or other high-risk
  rollouts.
- If release validation uses bespoke commands outside the lane runner, record
  the run manually with `npm run testing:record`.

## Documentation Rule

Major test runs must be recorded in the testing run ledger:

- lane-based runs that use `pr-required`, `nightly-deep`, `weekly-audit`, or
  `release-gate`
- any manual build, e2e, integration, or coverage sweep that materially affects
  ship/no-ship confidence
- any large AI-agent validation pass that combines multiple suites

The ledger lives at
[`docs/metrics/testing-run-ledger-latest.md`](../metrics/testing-run-ledger-latest.md).

## Recording Rule

- Preferred: run one of the canonical lane commands; major lanes write to the
  ledger automatically.
- CI equivalents for major lanes should publish the same ledger surface under
  [`docs/metrics/testing-run-ledger-latest.*`](../metrics/testing-run-ledger-latest.md).
- Fallback: use `npm run testing:record -- --label="..." --status=ok --suite=...`
  after a major manual run.

Required record fields:

- what ran
- when it ran
- final status
- suite or lane scope
- duration when known
- artifacts generated
- follow-up notes if anything failed, was skipped, or stayed advisory

## Generated Surfaces

- Suite inventory: [`docs/metrics/testing-suite-inventory-latest.md`](../metrics/testing-suite-inventory-latest.md)
- Run ledger: [`docs/metrics/testing-run-ledger-latest.md`](../metrics/testing-run-ledger-latest.md)
- Quality snapshot: [`docs/metrics/testing-quality-snapshot-latest.md`](../metrics/testing-quality-snapshot-latest.md)
- Weekly report: [`docs/metrics/weekly-quality-latest.md`](../metrics/weekly-quality-latest.md)

## Change Management

- Update the registry first when lane membership changes.
- Update this policy and the testing runbook in the same patch if cadence or
  operator expectations change.
- Add or update contract tests under `scripts/testing/` when introducing new
  lanes, suites, or generated testing docs.
