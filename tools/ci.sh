#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"
mkdir -p build/reports build/tmp
python3 tools/sync_version.py
python3 tools/render_roadmap.py
node --test --test-isolation=none web/tests/*.test.js
PYTHONPATH=src .venv/bin/python -m unittest discover -s tests
sh tools/build_edge_zmk.sh --ble-studio
EDGE_TEST_BUILD=lofree_edge-ble-studio .venv/bin/python tools/test_edge_ble_delayed_dma.py
EDGE_TEST_BUILD=lofree_edge-ble-studio .venv/bin/python tools/test_edge_boot_emulator.py
EDGE_TEST_BUILD=lofree_edge-ble-studio .venv/bin/python tools/test_edge_import_emulator.py
EDGE_SITE_BASE='' sh tools/build_edge_studio_ui.sh
.venv/bin/python tools/package_release.py --site-base '' --site-only --site-output build/localhost-site
python3 tools/check_website.py --site build/localhost-site --base ''
EDGE_SITE_BASE=/lofree-edge-zmk sh tools/build_edge_studio_ui.sh
.venv/bin/python tools/package_release.py --site-base /lofree-edge-zmk
python3 tools/check_website.py --site build/site --base /lofree-edge-zmk
.venv/bin/python tools/audit_publication.py --site build/site --archive build/release/lofree-edge-zmk-$(cat VERSION)-source.tar.gz --archive build/release/lofree-edge-zmk-$(cat VERSION)-website.tar.gz
git diff --exit-code
