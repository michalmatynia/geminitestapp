#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

./tools/bazel/run-bazel.sh run //:case_resolver_regression
./tools/bazel/run-bazel.sh run //:products_trigger_queue_unit
