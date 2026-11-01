#!/bin/sh
# Reproducible experimental USB build; never opens a keyboard.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
ZMK="$ROOT/.deps/zmk-tc32"
ZEPHYR_BASE="$ROOT/.deps/zephyr-tc32"
export ZEPHYR_BASE
export PATH="$ROOT/.venv/bin:$PATH"
export PYTHONDONTWRITEBYTECODE=1
export TMPDIR="$ROOT/build/tmp"
export XDG_CACHE_HOME="$ROOT/build/tmp/cache"
BUILD="$ROOT/firmware/build/lofree_edge-usb"
MODULES="$ZMK/tc32/compat;$ZMK/app/module;$ZMK/tc32;$ROOT/firmware;$ZMK/app/keymap-module"
OVERLAYS="$ROOT/firmware/lofree_edge/lofree_edge.keymap"
CONFIGS="$ZMK/tc32/compat/zephyr44.conf"
case "${1:-}" in
 --studio|--studio-export|--ble-studio|--ble-studio-export)
  python3 "$ROOT/tools/check_dependency.py" nanopb
  python3 "$ROOT/tools/check_dependency.py" zmk-studio-messages
  python "$ROOT/tools/generate_edge_studio.py"
  BUILD="$ROOT/firmware/build/lofree_edge-studio"
  MODULES="$MODULES;$ROOT/.deps/nanopb;$ROOT/.deps/zmk-studio-messages"
  OVERLAYS="$ROOT/firmware/lofree_edge/studio.keymap;$ROOT/firmware/lofree_edge/studio.overlay"
  CONFIGS="$CONFIGS;$ROOT/firmware/lofree_edge/studio.conf"
  if [ "$1" = --studio-export ]; then
   test -n "${2:-}" && test -f "$2"
   BUILD="$ROOT/firmware/build/lofree_edge-export-validation"
   OVERLAYS="$2;$ROOT/firmware/lofree_edge/studio.overlay"
  fi
  ;;
 --ble)
  BUILD="$ROOT/firmware/build/lofree_edge-ble"
  ;;
 "") ;;
 *) echo "Usage: $0 [--studio | --studio-export /absolute/path/to/file.keymap | --ble | --ble-studio | --ble-studio-export /absolute/path/to/file.keymap]" >&2; exit 2 ;;
esac
case "${1:-}" in
 --ble|--ble-studio|--ble-studio-export)
  BUILD="$ROOT/firmware/build/lofree_edge-${1#--}"
  OVERLAYS="$OVERLAYS;$ROOT/firmware/lofree_edge/ble.overlay"
  CONFIGS="$CONFIGS;$ROOT/firmware/lofree_edge/ble.conf"
  if [ "$1" != --ble ]; then
   CONFIGS="$CONFIGS;$ROOT/firmware/lofree_edge/ble-studio.conf"
   python "$ROOT/tools/generate_edge_studio.py" --ble
   OVERLAYS="$ROOT/firmware/lofree_edge/studio-ble.keymap;$ROOT/firmware/lofree_edge/studio.overlay;$ROOT/firmware/lofree_edge/ble.overlay"
   if [ "$1" = --ble-studio-export ]; then
    test -n "${2:-}" && test -f "$2"
    BUILD="$ROOT/firmware/build/lofree_edge-ble-export-validation"
    OVERLAYS="$2;$ROOT/firmware/lofree_edge/studio.overlay;$ROOT/firmware/lofree_edge/ble.overlay"
   fi
  fi
  ;;
esac
export SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH:-$(git -C "$ROOT" log -1 --format=%ct 2>/dev/null || echo 0)}
cmake -S "$ZMK/app" -B "$BUILD" -GNinja \
 -DZephyr_DIR="$ZEPHYR_BASE/share/zephyr-package/cmake" \
 "-DZEPHYR_MODULES=$MODULES" \
 -DCMAKE_EXPORT_COMPILE_COMMANDS=ON \
 "-DCMAKE_C_FLAGS=-ffile-prefix-map=$ROOT=. -fdebug-prefix-map=$ROOT=. -DLOFREE_BUILD_EPOCH=$SOURCE_DATE_EPOCH" \
 "-DCMAKE_ASM_FLAGS=-ffile-prefix-map=$ROOT=. -fdebug-prefix-map=$ROOT=. -DLOFREE_BUILD_EPOCH=$SOURCE_DATE_EPOCH" \
 -DBOARD=lofree_edge -DZEPHYR_TOOLCHAIN_VARIANT=host/llvm \
 -DLLVM_TOOLCHAIN_PATH="${LLVM_TOOLCHAIN_PATH:-/usr}" -DTC32_THUMB=ON \
 -DTC32_THUMB_TOOLS="$ROOT/.deps/tc32-devtools/compiler" \
 -DPython3_EXECUTABLE="$ROOT/.venv/bin/python" \
 -DUSER_CACHE_DIR="$ROOT/build/tmp/cache" \
 -DBUILD_VERSION="$(cat "$ROOT/VERSION")" \
 -DEXTRA_DTC_OVERLAY_FILE="$OVERLAYS" \
 -DEXTRA_CONF_FILE="$CONFIGS"
cmake --build "$BUILD" -- -j4
TOOLS="$ROOT/.deps/tc32-devtools/compiler"
python "$TOOLS/thumb2tc32.py" "$BUILD/zephyr/zmk.elf" "$BUILD/zephyr/zmk.bin"
python "$TOOLS/image_check.py" "$BUILD/zephyr/zmk.elf" "$BUILD/zephyr/zmk.bin" \
 --blob "$ZMK/tc32/src/tlsr_spi_flash_io.json" \
 --startup "$ZEPHYR_BASE/soc/telink/tlsr/tlsr827x/setup/tlsr8278_startup.json"
python "$TOOLS/forms_check.py" check "$BUILD/zephyr/zmk.elf" --thumb > "$BUILD/instruction-forms.txt"
python "$ZMK/tc32/scripts/telink_ota.py" image "$BUILD/zephyr/zmk.bin" "$BUILD/zephyr/zmk.ota.bin"
python "$ROOT/tools/edge_ota.py" check "$BUILD/zephyr/zmk.ota.bin"

python "$ROOT/tools/write_build_provenance.py" "$BUILD"
