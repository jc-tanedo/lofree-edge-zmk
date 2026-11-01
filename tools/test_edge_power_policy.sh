#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"
mkdir -p build/reports/power
cc -std=c11 -Wall -Wextra -Werror -fsanitize=undefined -Ifirmware/boards/lofree/lofree_edge tests/edge_power_policy.c -o build/reports/power/policy-test
build/reports/power/policy-test
NODE_PATH="$ROOT/.deps/zmk-studio/node_modules" .deps/zmk-studio/node_modules/.bin/esbuild web/tests/power-codec.ts --bundle --platform=node --format=cjs --outfile=build/reports/power/codec-test.cjs
node build/reports/power/codec-test.cjs
