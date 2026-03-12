#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BUILD_WORKSPACE_DIRECTORY:-}" ]]; then
  echo "BUILD_WORKSPACE_DIRECTORY is not set. Invoke this target with 'bazel run'." >&2
  exit 1
fi

cd "${BUILD_WORKSPACE_DIRECTORY}"

node scripts/testing/run-playwright-suite.mjs --runtime-cleanup

exec node scripts/testing/run-playwright-suite.mjs \
  --runtime-stop-after \
  e2e/features/products/products-trigger-queue-integration.spec.ts
