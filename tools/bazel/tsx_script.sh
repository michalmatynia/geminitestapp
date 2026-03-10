#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BUILD_WORKSPACE_DIRECTORY:-}" ]]; then
  echo "BUILD_WORKSPACE_DIRECTORY is not set. Invoke this target with 'bazel run'." >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: tsx_script.sh <script-path> [extra args...]" >&2
  exit 1
fi

script_path="$1"
shift

cd "${BUILD_WORKSPACE_DIRECTORY}"
exec ./node_modules/.bin/tsx "${script_path}" "$@"
