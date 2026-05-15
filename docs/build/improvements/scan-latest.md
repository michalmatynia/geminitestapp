---
owner: 'Platform Team'
last_reviewed: '2026-05-15'
status: 'generated'
doc_type: 'generated'
scope: 'cross-feature'
canonical: true
---
# Improvement Operations Portfolio

Generated at: 2026-05-15T06:52:27.982Z

## Snapshot

- Total tracks: 7
- Default read-only tracks: 5
- Tracks with data: 1
- Failed tracks: 1
- Attention tracks: 0

## Canonical Bundles

- `npm run improvements:read-only` -> products-parameter-integrity, products-category-schema-normalization, ui-consolidation, application-performance, repo-quality-baseline
- `npm run improvements:application` -> ui-consolidation, application-performance, testing-quality-baseline, image-studio-product-integration, repo-quality-baseline
- `npm run improvements:image-studio` -> image-studio-product-integration
- `npm run improvements:products` -> products-parameter-integrity, products-category-schema-normalization
- `npm run improvements:refresh-docs` -> regenerate this hub from the latest improvement reports

## Latest Read-Only Batch

- No `artifacts/improvements/read-only-batch-report.json` data is available yet.

## Track Coverage

| Track | Category | Default | Overall | Latest Report | README | Scan |
| --- | --- | --- | --- | --- | --- | --- |
| `products-parameter-integrity` | `data` | yes | `no-data` | not available | [README](./products-parameter-integrity/README.md) | [scan](./products-parameter-integrity/scan-latest.md) |
| `products-category-schema-normalization` | `data` | yes | `no-data` | not available | [README](./products-category-schema-normalization/README.md) | [scan](./products-category-schema-normalization/scan-latest.md) |
| `ui-consolidation` | `ui` | yes | `failed` | 2026-05-14T23:11:20.592Z | [README](./ui-consolidation/README.md) | [scan](./ui-consolidation/scan-latest.md) |
| `application-performance` | `performance` | yes | `no-data` | not available | [README](./application-performance/README.md) | [scan](./application-performance/scan-latest.md) |
| `testing-quality-baseline` | `testing` | no | `no-data` | not available | [README](./testing-quality-baseline/README.md) | [scan](./testing-quality-baseline/scan-latest.md) |
| `image-studio-product-integration` | `quality` | no | `no-data` | not available | [README](./image-studio-product-integration/README.md) | [scan](./image-studio-product-integration/scan-latest.md) |
| `repo-quality-baseline` | `quality` | yes | `no-data` | not available | [README](./repo-quality-baseline/README.md) | [scan](./repo-quality-baseline/scan-latest.md) |

## Notes

- This hub is the canonical improvement-operations surface for broad repo work.
- Legacy single-program surfaces such as `docs/ui-consolidation` remain valid while active, but new improvement tracks should land here.
- `inventory-latest.csv` is the machine-readable portfolio-level inventory.
