#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BUILD_WORKSPACE_DIRECTORY:-}" ]]; then
  echo "BUILD_WORKSPACE_DIRECTORY is not set. Invoke this target with 'bazel run'." >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: node_bin.sh <binary-name> [args...]" >&2
  exit 1
fi

bin_name="$1"
shift

cd "${BUILD_WORKSPACE_DIRECTORY}"

max_old_space_size="${BAZEL_NODE_MAX_OLD_SPACE_SIZE:-12288}"

if [[ "${NODE_OPTIONS:-}" != *"--max-old-space-size="* ]]; then
  if [[ -n "${NODE_OPTIONS:-}" ]]; then
    export NODE_OPTIONS="${NODE_OPTIONS} --max-old-space-size=${max_old_space_size}"
  else
    export NODE_OPTIONS="--max-old-space-size=${max_old_space_size}"
  fi
fi

exec "./node_modules/.bin/${bin_name}" "$@"
