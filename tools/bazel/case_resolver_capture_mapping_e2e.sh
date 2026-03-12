#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BUILD_WORKSPACE_DIRECTORY:-}" ]]; then
  echo "BUILD_WORKSPACE_DIRECTORY is not set. Invoke this target with 'bazel run'." >&2
  exit 1
fi

cd "${BUILD_WORKSPACE_DIRECTORY}"

exec node scripts/testing/run-playwright-suite.mjs \
  e2e/features/case-resolver/case-resolver.spec.ts \
  --grep \
  "capture mapping"
