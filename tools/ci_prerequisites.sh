#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
# Registered Linux/X64 runners use Debian/Ubuntu with root or passwordless sudo.
set -eu
if [ "${GITHUB_ACTIONS:-}" != true ]; then
  echo 'System setup is restricted to Actions jobs.' >&2
  exit 1
fi
if [ "$(id -u)" = 0 ]; then
  elevate() { "$@"; }
else
  elevate() { sudo -n "$@"; }
fi
cat /etc/os-release
command -v apt-get >/dev/null || { echo 'Runner requires Debian/Ubuntu (apt-get).' >&2; exit 1; }
elevate apt-get update
elevate env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  ca-certificates git curl gh python3 python3-venv build-essential cmake \
  device-tree-compiler protobuf-compiler ninja-build libtinfo6 zstd unzip xz-utils
