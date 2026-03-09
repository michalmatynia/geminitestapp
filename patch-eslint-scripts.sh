#!/usr/bin/env bash
set -euo pipefail

node <<'NODE'
const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts ||= {};

// Quiet normal runs
pkg.scripts['lint'] = 'eslint src --cache --cache-location .eslintcache --no-error-on-unmatched-pattern';
pkg.scripts['lint:fix'] = 'eslint src --fix --cache --cache-location .eslintcache --no-error-on-unmatched-pattern';
pkg.scripts['lint:tests'] = 'ESLINT_INCLUDE_TESTS=1 eslint src e2e --cache --cache-location .eslintcache --no-error-on-unmatched-pattern';
pkg.scripts['lint:fix:tests'] = 'ESLINT_INCLUDE_TESTS=1 eslint src e2e --fix --cache --cache-location .eslintcache --no-error-on-unmatched-pattern';

// Visible progress / diagnostics
pkg.scripts['lint:debug'] = 'TIMING=1 eslint src --debug --cache --cache-location .eslintcache --no-error-on-unmatched-pattern';
pkg.scripts['lint:fix:debug'] = 'TIMING=1 eslint src --fix --debug --cache --cache-location .eslintcache --no-error-on-unmatched-pattern';

// Small-scope runs
pkg.scripts['lint:app'] = 'eslint "src/app/**/*.{ts,tsx,js,jsx}" --cache --cache-location .eslintcache --no-error-on-unmatched-pattern';
pkg.scripts['lint:fix:app'] = 'eslint "src/app/**/*.{ts,tsx,js,jsx}" --fix --cache --cache-location .eslintcache --no-error-on-unmatched-pattern';

pkg.scripts['lint:features'] = 'eslint "src/features/**/*.{ts,tsx,js,jsx}" --cache --cache-location .eslintcache --no-error-on-unmatched-pattern';
pkg.scripts['lint:fix:features'] = 'eslint "src/features/**/*.{ts,tsx,js,jsx}" --fix --cache --cache-location .eslintcache --no-error-on-unmatched-pattern';

pkg.scripts['lint:shared'] = 'eslint "src/shared/**/*.{ts,tsx,js,jsx}" --cache --cache-location .eslintcache --no-error-on-unmatched-pattern';
pkg.scripts['lint:fix:shared'] = 'eslint "src/shared/**/*.{ts,tsx,js,jsx}" --fix --cache --cache-location .eslintcache --no-error-on-unmatched-pattern';

// Single-file smoke test
pkg.scripts['lint:one'] = 'eslint src/app/api/agent/resources/route.ts --fix --debug --cache --cache-location .eslintcache';

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
NODE

echo "Updated package.json scripts."
echo "Run one of these:"
echo "  npm run lint:one"
echo "  npm run lint:fix:debug"
echo "  npm run lint:fix:app"
echo "  npm run lint:fix:features"
echo "  npm run lint:fix:shared"
