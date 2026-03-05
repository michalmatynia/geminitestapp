# Step 13 Execution: Domain Trend Reports

Date: 2026-03-05

## Objective

Add rolling trend reports for unit-domain and lint-domain gates (7-day deltas) to make regressions visible over time.

## Implemented Artifacts

- New script: `scripts/quality/report-domain-suite-trend.mjs`
  - Supports:
    - `--suite=unit-domain-timings`
    - `--suite=lint-domain-checks`
  - Defaults:
    - `--days=7`
    - `--max-runs=20`
  - Outputs trend reports as `latest` + timestamped history.
- Unit-domain trend outputs:
  - `docs/metrics/unit-domain-timings-trend-latest.json`
  - `docs/metrics/unit-domain-timings-trend-latest.md`
  - `docs/metrics/unit-domain-timings-trend-2026-03-05T04-17-47-898Z.json`
  - `docs/metrics/unit-domain-timings-trend-2026-03-05T04-17-47-898Z.md`
- Lint-domain trend outputs:
  - `docs/metrics/lint-domain-checks-trend-latest.json`
  - `docs/metrics/lint-domain-checks-trend-latest.md`
  - `docs/metrics/lint-domain-checks-trend-2026-03-05T04-17-48-061Z.json`
  - `docs/metrics/lint-domain-checks-trend-2026-03-05T04-17-48-061Z.md`

## Validation

- `node scripts/quality/report-domain-suite-trend.mjs --suite=unit-domain-timings --days=7`: pass
- `node scripts/quality/report-domain-suite-trend.mjs --suite=lint-domain-checks --days=7`: pass
- `node scripts/quality/report-domain-suite-trend.mjs --suite=unit-domain-timings --days=7 --ci --no-history`: pass
- `node scripts/quality/report-domain-suite-trend.mjs --suite=lint-domain-checks --days=7 --ci --no-history`: pass
- `node --check scripts/quality/report-domain-suite-trend.mjs`: pass

## Current Baseline Snapshot

- Unit-domain trend:
  - runs analyzed: `2`
  - window: `2026-03-05T03:33:16.314Z` -> `2026-03-05T03:49:28.650Z`
  - total-duration delta (latest vs previous): `+5.3s`
- Lint-domain trend:
  - runs analyzed: `2`
  - window: `2026-03-05T04:00:57.270Z` -> `2026-03-05T04:06:33.027Z`
  - total-duration delta (latest vs previous): `+1.6m`
