#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"
mkdir -p build/reports build/tmp
export TMPDIR="$ROOT/build/tmp"
export LLVM_TOOLCHAIN_PATH="${LLVM_TOOLCHAIN_PATH:-$ROOT/build/toolchain23}"
export PATH="$LLVM_TOOLCHAIN_PATH/bin:$PATH"
python3 tools/sync_version.py
python3 tools/render_roadmap.py
sh tools/test_edge_power_policy.sh
node --test web/tests/*.test.js
PYTHONPATH=src .venv/bin/python -m unittest discover -s tests
sh tools/build_edge_zmk.sh --ble-studio
TC32EMU_SUSPEND_RF=lost EDGE_TEST_BUILD=lofree_edge-ble-studio EDGE_TEST_POWER_SLEEP=1 .venv/bin/python tools/test_edge_ble_delayed_dma.py
EDGE_TEST_BUILD=lofree_edge-ble-studio .venv/bin/python tools/test_edge_power_states_emulator.py
EDGE_TEST_BUILD=lofree_edge-ble-studio .venv/bin/python tools/test_edge_bt_deep_entry.py
EDGE_TEST_BUILD=lofree_edge-ble-studio .venv/bin/python tools/test_edge_power_stacks_emulator.py
EDGE_TEST_BUILD=lofree_edge-ble-studio .venv/bin/python tools/test_edge_boot_emulator.py
EDGE_TEST_BUILD=lofree_edge-ble-studio .venv/bin/python tools/test_edge_import_emulator.py
EDGE_SWITCH_DIAGNOSTIC=1 sh tools/build_edge_zmk.sh --ble-studio
EDGE_TEST_BUILD=lofree_edge-ble-studio-switch-diagnostic .venv/bin/python tools/test_edge_switch_inputs_emulator.py
EDGE_SITE_BASE='' sh tools/build_edge_studio_ui.sh
.venv/bin/python tools/package_release.py --site-base '' --site-only --site-output build/localhost-site
python3 tools/check_website.py --site build/localhost-site --base ''
EDGE_SITE_BASE=/lofree-edge-zmk sh tools/build_edge_studio_ui.sh
.venv/bin/python tools/package_release.py --site-base /lofree-edge-zmk
python3 tools/check_website.py --site build/site --base /lofree-edge-zmk
.venv/bin/python tools/audit_publication.py --site build/site --archive build/release/lofree-edge-zmk-$(cat VERSION)-source.tar.gz --archive build/release/lofree-edge-zmk-$(cat VERSION)-website.tar.gz
git diff --exit-code
