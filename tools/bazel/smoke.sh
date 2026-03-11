#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
cd "${root_dir}"

targets=(
  "//:lint"
  "//:typecheck"
  "//:unit"
  "//:integration_prisma"
  "//:integration_mongo"
  "//:next_build"
  "//:api_error_sources"
)

./tools/bazel/run-bazel.sh query //:all

for target in "${targets[@]}"; do
  ./tools/bazel/run-bazel.sh run "${target}"
done
