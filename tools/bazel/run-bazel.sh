#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
cd "${root_dir}"

args=()

if [[ -n "${BAZEL_REMOTE_CACHE_URL:-}" ]]; then
  args+=("--remote_cache=${BAZEL_REMOTE_CACHE_URL}")

  if [[ -n "${BAZEL_REMOTE_CACHE_UPLOAD_LOCAL_RESULTS:-}" ]]; then
    args+=("--remote_upload_local_results=${BAZEL_REMOTE_CACHE_UPLOAD_LOCAL_RESULTS}")
  fi

  if [[ -n "${BAZEL_REMOTE_CACHE_HEADER:-}" ]]; then
    args+=("--remote_header=${BAZEL_REMOTE_CACHE_HEADER}")
  fi
fi

if [[ ${#args[@]} -gt 0 ]]; then
  exec ./node_modules/.bin/bazelisk "${args[@]}" "$@"
fi

exec ./node_modules/.bin/bazelisk "$@"
