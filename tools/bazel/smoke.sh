#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/../.." && pwd)"
cd "${root_dir}"

# Compatibility shim. The canonical repo entrypoint is `npm run bazel:smoke`,
# which resolves to the root Bazel lane `//:repo_smoke`.
./tools/bazel/run-bazel.sh run //:repo_smoke
