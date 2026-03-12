#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BUILD_WORKSPACE_DIRECTORY:-}" ]]; then
  echo "BUILD_WORKSPACE_DIRECTORY is not set. Invoke this target with 'bazel run'." >&2
  exit 1
fi

cd "${BUILD_WORKSPACE_DIRECTORY}"
max_old_space_size="${BAZEL_NODE_MAX_OLD_SPACE_SIZE:-12288}"

exec env NODE_OPTIONS=--max-old-space-size="${max_old_space_size}" ./node_modules/.bin/next build --webpack
