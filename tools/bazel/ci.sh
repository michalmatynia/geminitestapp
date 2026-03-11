#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

bash ./tools/bazel/smoke.sh
bash ./tools/bazel/specialized-regressions.sh
