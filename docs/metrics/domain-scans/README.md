---
owner: 'Platform Team'
last_reviewed: '2026-04-07'
status: 'active'
doc_type: 'index'
scope: 'generated'
canonical: true
---
# Domain Scan Artifacts

This folder holds stable latest snapshots for domain-specific type-cluster scans.
These are generated artifacts and should be refreshed through the relevant scan
pipeline rather than hand-edited.

## Current Scan Sets

- Feature AI: [`type-clusters-feature-ai-latest.md`](./type-clusters-feature-ai-latest.md)
- Feature Case Resolver:
  [`type-clusters-feature-case-resolver-latest.md`](./type-clusters-feature-case-resolver-latest.md)
- Feature Integrations:
  [`type-clusters-feature-integrations-latest.md`](./type-clusters-feature-integrations-latest.md)
- Shared Contracts:
  [`type-clusters-shared-contracts-latest.md`](./type-clusters-shared-contracts-latest.md)
- Shared Runtime:
  [`type-clusters-shared-latest.md`](./type-clusters-shared-latest.md)

## Artifact Rule

- Each scan set may include `.md`, `.json`, and `.csv` outputs with the same base name.
- Prefer the markdown files for human review and the JSON/CSV files for automation.
- Regenerate the current domain scan set with `npm run metrics:type-clusters:domains`.
- For the wider generated-report surface, start at
  [`docs/metrics/README.md`](../README.md).
