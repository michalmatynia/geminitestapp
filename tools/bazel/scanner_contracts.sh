#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BUILD_WORKSPACE_DIRECTORY:-}" ]]; then
  echo "BUILD_WORKSPACE_DIRECTORY is not set. Invoke this target with 'bazel run'." >&2
  exit 1
fi

cd "${BUILD_WORKSPACE_DIRECTORY}"

./node_modules/.bin/eslint \
  "scripts/ai-paths/**/*.{mjs,ts}" \
  "scripts/architecture/**/*.{mjs,ts}" \
  "scripts/auth/**/*.ts" \
  "scripts/canonical/**/*.{mjs,ts}" \
  "scripts/cleanup/**/*.{mjs,ts}" \
  "scripts/db/**/*.{mjs,ts}" \
  "scripts/docs/**/*.{mjs,ts}" \
  "scripts/lib/**/*.mjs" \
  "scripts/observability/**/*.{mjs,ts}" \
  "scripts/perf/**/*.{mjs,ts}" \
  "scripts/quality/**/*.{mjs,ts}" \
  "scripts/testing/**/*.{mjs,ts}"

exec ./node_modules/.bin/vitest run scripts/architecture/scan-summary-json-envelope.test.ts
