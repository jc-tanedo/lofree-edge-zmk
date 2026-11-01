#!/bin/sh
# Stage pinned official Studio with the project-owned Edge interface.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
SOURCE="$ROOT/.deps/zmk-studio"
export TMPDIR="$ROOT/build/tmp"
export npm_config_cache="$ROOT/build/tmp/npm-cache"
cd "$SOURCE"
python3 "$ROOT/tools/check_dependency.py" zmk-studio
python3 "$ROOT/tools/generate_keymap_export_data.py"
node "$ROOT/tools/generate_edge_info.mjs"
python3 "$ROOT/tools/prepare_edge_studio_ui.py"
cd "$ROOT/build/tmp/studio-ui-edge"
mkdir -p src/data
cp "$ROOT/data/studio-release-data.json" src/data/release-data.json
./node_modules/.bin/tsc
./node_modules/.bin/vite build --base="${EDGE_SITE_BASE:-}/studio/" --outDir="$ROOT/web/dist/studio" --emptyOutDir=true
cp LICENSE NOTICE "$ROOT/web/dist/studio/"
