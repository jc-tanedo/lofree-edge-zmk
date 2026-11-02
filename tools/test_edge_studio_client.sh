#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"
mkdir -p build/reports
NODE_PATH="$ROOT/.deps/zmk-studio/node_modules" .deps/zmk-studio/node_modules/.bin/esbuild web/tests/serial-cleanup.ts --bundle --platform=node --format=esm --outfile=build/reports/serial-cleanup.mjs
node build/reports/serial-cleanup.mjs

NODE_PATH="$ROOT/.deps/zmk-studio/node_modules" .deps/zmk-studio/node_modules/.bin/esbuild web/tests/serial-reconnect.ts --bundle --platform=node --format=esm --outfile=build/reports/serial-reconnect.mjs
node build/reports/serial-reconnect.mjs
