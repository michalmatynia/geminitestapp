---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'generated'
canonical: true
---
# Metrics And Generated Reports

This directory is the generated output surface for repo-wide quality, guardrail,
and architecture reporting. Most files here are timestamped history snapshots,
not hand-written documentation.

## Open This Hub When

- you need the latest generated repo health report instead of a hand-written policy doc
- you need to know which `*-latest.md` file corresponds to a quality question
- you are refreshing generated metrics and need the right regeneration command
- you need to distinguish stable aliases from timestamped history snapshots

## Stable Entry Points

Use the `*-latest.md` aliases when you need a stable reference:

### Repo Health And Architecture

- [`baseline-latest.md`](./baseline-latest.md)
- [`route-hotspots.md`](./route-hotspots.md)
- [`bundle-budgets-latest.md`](./bundle-budgets-latest.md)
- [`prop-drilling-latest.md`](./prop-drilling-latest.md)
- [`type-clusters-latest.md`](./type-clusters-latest.md)
- [`type-clusters-plan-latest.md`](./type-clusters-plan-latest.md)
- [`type-clusters-domain-scan-latest.md`](./type-clusters-domain-scan-latest.md)

### Performance And Execution

- [`critical-path-performance-latest.md`](./critical-path-performance-latest.md)
- [`critical-flow-tests-latest.md`](./critical-flow-tests-latest.md)
- [`unit-domain-timings-latest.md`](./unit-domain-timings-latest.md)
- [`kangur-performance-latest.md`](./kangur-performance-latest.md)
- [`integration-mongo-latest.md`](./integration-mongo-latest.md)

### Policy, Safety, And Runtime Checks

- [`context-health-latest.md`](./context-health-latest.md)
- [`import-boundaries-latest.md`](./import-boundaries-latest.md)
- [`unsafe-patterns-latest.md`](./unsafe-patterns-latest.md)
- [`route-policies-latest.md`](./route-policies-latest.md)
- [`next-route-config-reexports-latest.md`](./next-route-config-reexports-latest.md)
- [`api-error-sources-latest.md`](./api-error-sources-latest.md)
- [`api-input-validation-latest.md`](./api-input-validation-latest.md)
- [`api-contract-coverage-latest.md`](./api-contract-coverage-latest.md)
- [`env-contract-latest.md`](./env-contract-latest.md)
- [`queue-runtime-latest.md`](./queue-runtime-latest.md)
- [`storage-and-files-latest.md`](./storage-and-files-latest.md)
- [`security-static-latest.md`](./security-static-latest.md)
- [`external-rule-parity-latest.md`](./external-rule-parity-latest.md)
- [`security-authz-matrix-latest.md`](./security-authz-matrix-latest.md)
- [`security-smoke-latest.md`](./security-smoke-latest.md)
- [`accessibility-component-policies-latest.md`](./accessibility-component-policies-latest.md)
- [`accessibility-route-crawl-latest.md`](./accessibility-route-crawl-latest.md)
- [`accessibility-smoke-latest.md`](./accessibility-smoke-latest.md)

### Testing, Coverage, And Trends

- [`testing-suite-inventory-latest.md`](./testing-suite-inventory-latest.md)
- [`testing-run-ledger-latest.md`](./testing-run-ledger-latest.md)
- [`testing-quality-snapshot-latest.md`](./testing-quality-snapshot-latest.md)
- [`test-distribution-latest.md`](./test-distribution-latest.md)
- [`high-risk-coverage-latest.md`](./high-risk-coverage-latest.md)
- [`weekly-quality-latest.md`](./weekly-quality-latest.md)
- [`weekly-quality-trend-latest.md`](./weekly-quality-trend-latest.md)
- [`trend-index-latest.md`](./trend-index-latest.md)
- [`weekly-duration-budget-recommendations-latest.md`](./weekly-duration-budget-recommendations-latest.md)

## Which Report To Open

| If you need to know... | Open |
| --- | --- |
| overall repo quality baseline | [`baseline-latest.md`](./baseline-latest.md) |
| route-level hotspots and architecture concentration | [`route-hotspots.md`](./route-hotspots.md) |
| type-cluster status and follow-up plan | [`type-clusters-latest.md`](./type-clusters-latest.md), [`type-clusters-plan-latest.md`](./type-clusters-plan-latest.md) |
| domain-level type-cluster output | [`type-clusters-domain-scan-latest.md`](./type-clusters-domain-scan-latest.md) |
| critical runtime or flow performance | [`critical-path-performance-latest.md`](./critical-path-performance-latest.md), [`critical-flow-tests-latest.md`](./critical-flow-tests-latest.md) |
| unit timing or suite trend drift | [`unit-domain-timings-latest.md`](./unit-domain-timings-latest.md), [`trend-index-latest.md`](./trend-index-latest.md) |
| security posture or smoke coverage | [`security-static-latest.md`](./security-static-latest.md), [`security-authz-matrix-latest.md`](./security-authz-matrix-latest.md), [`security-smoke-latest.md`](./security-smoke-latest.md) |
| accessibility coverage | [`accessibility-component-policies-latest.md`](./accessibility-component-policies-latest.md), [`accessibility-route-crawl-latest.md`](./accessibility-route-crawl-latest.md), [`accessibility-smoke-latest.md`](./accessibility-smoke-latest.md) |
| test inventory, ledger, or quality trend | [`testing-suite-inventory-latest.md`](./testing-suite-inventory-latest.md), [`testing-run-ledger-latest.md`](./testing-run-ledger-latest.md), [`testing-quality-snapshot-latest.md`](./testing-quality-snapshot-latest.md), [`weekly-quality-latest.md`](./weekly-quality-latest.md) |

## Generated Subareas

- Domain scans hub: [`./domain-scans/README.md`](./domain-scans/README.md)

## Common Regeneration Commands

- Testing suite inventory: `npm run metrics:test-suite-inventory`
- Testing run ledger latest aliases: `npm run metrics:test-run-ledger`, `npm run testing:record -- --label="..." --status=ok --suite=...`
- Quality and policy latest aliases: `npm run check:quality:extended`
- External static-rule parity latest aliases:
  `npm run check:external-rule-parity`,
  `npm run check:external-rule-parity:strict`
- Weekly quality report: `npm run quality:weekly-report`
- Weekly and domain trend aliases: `node scripts/quality/report-weekly-lane-trend.mjs`, `node scripts/quality/report-domain-suite-trend.mjs --suite=unit-domain-timings`, `node scripts/quality/report-domain-suite-trend.mjs --suite=lint-domain-checks`, `npm run quality:trend-index:ci`
- Duration-budget recommendations: `npm run quality:weekly-duration-budgets:ci`
- Type cluster latest aliases: `npm run metrics:type-clusters:init`
- Type cluster domain scans: `npm run metrics:type-clusters:domains`
- UI consolidation latest aliases: `npm run check:ui-consolidation`

## Structure Notes

- stable `*-latest.md` aliases are the default markdown surface
- each stable markdown alias normally has a matching `.json`, and some also
  publish `.csv` for automation
- timestamped markdown history is opt-in when a generator is run with
  `--write-history`
- if you encounter a dated file such as `weekly-quality-2026-...md`, treat it
  as a retained historical snapshot and prefer the matching `*-latest.md` alias
  for current status
- historical snapshots may intentionally preserve older generated timestamps even
  after the surrounding hub docs are refreshed
- `domain-scans/` contains generated domain-level cluster outputs
- feature-specific generated areas can also exist outside this folder when the
  owning feature needs local artifacts
- prefer the stable alias before opening a timestamped report unless a task
  explicitly needs historical comparison

## External Rule Parity Notes

- The parity scanner normalizes the external static-analysis rule taxonomy onto
  the local quality framework using
  [`scripts/quality/config/external-rule-map.json`](../../scripts/quality/config/external-rule-map.json).
- Default runs refresh
  `docs/metrics/external-rule-parity-latest.json` and
  `docs/metrics/external-rule-parity-latest.md`. Add `--write-history` if a task
  explicitly needs timestamped history snapshots.
- Use `npm run check:external-rule-parity -- --help` for CLI usage and
  `npm run check:external-rule-parity -- --list-rules` to inspect the normalized
  rule catalog.
- Filter examples:
  `--rule=no-atomic-updates`,
  `--external-rule="Open Redirect"`,
  `--path=src/app/api/image-studio`,
  `--severity=warn`,
  `--catalog-status=implemented`.
- External-name filtering now records its resolution in the report, so filtered
  runs explain whether a requested rule maps to an `implemented`, `eslint`, or
  `waived` parity entry.

## Placement Rule

- Treat this directory as generated by scripts unless a hub page says otherwise.
- Prefer updating the generator or command that produces a report instead of
  manually editing a historical artifact.
- Default generator runs should refresh the latest aliases only. Only write
  timestamped markdown history when a task explicitly needs it.
- The weekly high-risk coverage baseline is generated by
  `npm run test:coverage:high-risk` with `HIGH_RISK_COVERAGE_CONCURRENCY=2`,
  then merged into the stable `high-risk-coverage-latest.*` aliases.
- If frontmatter or canonical registration drifts, run
  `npm run docs:metrics:normalize-frontmatter` to rewrite the metrics markdown
  surface and sync canonical metrics entries in the docs structure manifest.
- New stable human-written platform guidance should go to
  [`docs/platform/`](../platform/README.md), not here.
- This hub intentionally points to stable aliases and generated subareas rather
  than enumerating every timestamped history file.

## Related Docs

- Cross-feature operational procedures:
  [`docs/runbooks/README.md`](../runbooks/README.md)
- Platform policy and engineering guidance:
  [`docs/platform/README.md`](../platform/README.md)
