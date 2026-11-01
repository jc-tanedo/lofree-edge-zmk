#!/bin/sh
# Only expose curated public output, never the repository root.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
mkdir -p "$ROOT/build/preview"
ln -sfn "$ROOT/build/site" "$ROOT/build/preview/lofree-edge-zmk"
exec python3 -m http.server "${PORT:-8766}" --bind 127.0.0.1 --directory "$ROOT/build/preview"
