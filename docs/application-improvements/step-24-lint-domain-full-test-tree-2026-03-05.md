# Step 24 Execution: Lint Domain Full Test-Tree Support

Date: 2026-03-05

## Objective

Extend lint-domain checks from single-file probes to full per-domain test-tree linting, with explicit ESLint parser/config support.

## Implemented Artifacts

- Updated `scripts/quality/run-lint-domain-checks.mjs`:
  - Added `--include-test-tree` mode.
  - Added per-domain `testTreeTargets` coverage maps.
  - Added `ESLINT_INCLUDE_TESTS=1` environment toggle when test-tree mode is enabled.
  - Expanded report payload and markdown:
    - `includeTestTree`
    - `resolvedTestTreeTargets`
    - domain table `Test Trees` column
- Updated `eslint.config.cjs`:
  - Added env-driven global ignore behavior:
    - default keeps test files ignored
    - `ESLINT_INCLUDE_TESTS=1` opts test files into lint scope
  - Expanded test override file patterns to include:
    - `**/*.test.{js,jsx,ts,tsx}`
    - `**/*.spec.{js,jsx,ts,tsx}`
  - Added test parser project mapping:
    - `parserOptions.project: './tsconfig.eslint-tests.json'`
- Added `tsconfig.eslint-tests.json`:
  - Includes `__tests__`, `*.test.*`, `*.spec.*`, and `e2e` trees for ESLint type-aware parsing.
- Refreshed reports:
  - `docs/metrics/lint-domain-checks-latest.json`
  - `docs/metrics/lint-domain-checks-latest.md`
  - `docs/metrics/lint-domain-checks-2026-03-05T04-58-56-016Z.json`
  - `docs/metrics/lint-domain-checks-2026-03-05T04-58-56-016Z.md`

## Validation

- `node scripts/quality/run-lint-domain-checks.mjs --include-test-tree --strict --ci --no-history`: fail (`2/5` pass, `3/5` fail)
  - parser wiring now works for test files; remaining failures are real lint violations in:
    - Products
    - AI Paths
    - Case Resolver
- `node scripts/quality/run-lint-domain-checks.mjs --include-test-tree`: completed with report/history output
- `node --check scripts/quality/run-lint-domain-checks.mjs`: pass
- `node --check eslint.config.cjs`: pass

## Notes

- This step enables full test-tree lint coverage without changing default global lint behavior; strict adoption can proceed after current domain lint debt is reduced.
