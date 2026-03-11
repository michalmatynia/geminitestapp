#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BUILD_WORKSPACE_DIRECTORY:-}" ]]; then
  echo "BUILD_WORKSPACE_DIRECTORY is not set. Invoke this target with 'bazel run'." >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: bun_bin.sh <bun-args...>" >&2
  exit 1
fi

cd "${BUILD_WORKSPACE_DIRECTORY}"

exec bun "$@"
