---
owner: 'Platform Team'
last_reviewed: '2026-04-12'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# Improvement Operations Portfolio

Generated at: 2026-04-12T04:21:28.603Z

## Snapshot

- Total tracks: 6
- Default read-only tracks: 5
- Tracks with data: 5
- Failed tracks: 3
- Attention tracks: 0

## Canonical Bundles

- `npm run improvements:read-only` -> products-parameter-integrity, products-category-schema-normalization, ui-consolidation, application-performance, repo-quality-baseline
- `npm run improvements:application` -> ui-consolidation, application-performance, testing-quality-baseline, repo-quality-baseline
- `npm run improvements:products` -> products-parameter-integrity, products-category-schema-normalization
- `npm run improvements:refresh-docs` -> regenerate this hub from the latest improvement reports

## Latest Read-Only Batch

- Generated at: 2026-04-12T04:21:28.599Z
- Selected tracks: products-parameter-integrity, products-category-schema-normalization, ui-consolidation, application-performance, repo-quality-baseline

| Phase | Status | Duration (ms) | Report |
| --- | --- | ---: | --- |
| `audit` | `failed` | 40220 | `artifacts/improvements/audit-report.json` |
| `classify` | `failed` | 883908 | `artifacts/improvements/classify-report.json` |
| `plan` | `passed` | 280 | `artifacts/improvements/plan-report.json` |

## Track Coverage

| Track | Category | Default | Overall | Latest Report | README | Scan |
| --- | --- | --- | --- | --- | --- | --- |
| `products-parameter-integrity` | `data` | yes | `passed` | 2026-04-12T04:21:28.585Z | [README](./products-parameter-integrity/README.md) | [scan](./products-parameter-integrity/scan-latest.md) |
| `products-category-schema-normalization` | `data` | yes | `failed` | 2026-04-12T04:21:28.585Z | [README](./products-category-schema-normalization/README.md) | [scan](./products-category-schema-normalization/scan-latest.md) |
| `ui-consolidation` | `ui` | yes | `failed` | 2026-04-12T04:21:28.585Z | [README](./ui-consolidation/README.md) | [scan](./ui-consolidation/scan-latest.md) |
| `application-performance` | `performance` | yes | `passed` | 2026-04-12T04:21:28.585Z | [README](./application-performance/README.md) | [scan](./application-performance/scan-latest.md) |
| `testing-quality-baseline` | `testing` | no | `no-data` | not available | [README](./testing-quality-baseline/README.md) | [scan](./testing-quality-baseline/scan-latest.md) |
| `repo-quality-baseline` | `quality` | yes | `failed` | 2026-04-12T04:21:28.585Z | [README](./repo-quality-baseline/README.md) | [scan](./repo-quality-baseline/scan-latest.md) |

## Notes

- This hub is the canonical improvement-operations surface for broad repo work.
- Legacy single-program surfaces such as `docs/ui-consolidation` remain valid while active, but new improvement tracks should land here.
- `inventory-latest.csv` is the machine-readable portfolio-level inventory.
