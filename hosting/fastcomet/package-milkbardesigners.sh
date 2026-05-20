#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$ROOT_DIR/uploads.milkbardesigners.com/public_html"
OUTPUT_FILE="$ROOT_DIR/fastcomet-public_html-uploads-milkbardesigners.zip"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Missing source directory: $SOURCE_DIR" >&2
  exit 1
fi

rm -f "$OUTPUT_FILE"
(
  cd "$SOURCE_DIR"
  zip -r "$OUTPUT_FILE" . -x "*.DS_Store"
)

echo "$OUTPUT_FILE"
