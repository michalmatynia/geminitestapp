#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# Compatibility shim. The canonical repo entrypoint is `npm run bazel:ci`,
# which resolves to the root Bazel lane `//:repo_ci`.
./tools/bazel/run-bazel.sh run //:repo_ci
