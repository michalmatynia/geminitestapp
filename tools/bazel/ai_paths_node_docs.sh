#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BUILD_WORKSPACE_DIRECTORY:-}" ]]; then
  echo "BUILD_WORKSPACE_DIRECTORY is not set. Invoke this target with 'bazel run'." >&2
  exit 1
fi

cd "${BUILD_WORKSPACE_DIRECTORY}"

node scripts/docs/verify-ai-paths-node-docs.mjs
exec ./node_modules/.bin/tsx scripts/docs/check-ai-paths-tooltip-coverage.ts
