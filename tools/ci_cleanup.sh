#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
# Only ephemeral GitHub-hosted Linux runners; never clean a developer machine.
set -eu
mode=${1:-}
dry_run=${2:-}
case "$mode" in prepare|finish) ;; *) echo 'Usage: ci_cleanup.sh prepare|finish [--dry-run]' >&2; exit 2;; esac
case "$dry_run" in ''|--dry-run) ;; *) echo 'Unknown option' >&2; exit 2;; esac
if [ "${GITHUB_ACTIONS:-}" != true ] || [ "${RUNNER_ENVIRONMENT:-}" != github-hosted ] || [ "${RUNNER_OS:-}" != Linux ]; then
  echo 'Cleanup skipped: requires a GitHub-hosted Linux Actions runner.'
  exit 0
fi
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd -P)
workspace=$(CDPATH= cd -- "${GITHUB_WORKSPACE:?Missing GITHUB_WORKSPACE}" && pwd -P)
if [ "$root" = / ] || [ "$root" != "$workspace" ]; then
  echo 'Refusing cleanup outside the checked-out repository workspace.' >&2
  exit 1
fi
remove() {
  if [ "$dry_run" = --dry-run ]; then
    printf 'Would remove: %s\n' "$*"
  elif [ "$mode" = prepare ]; then
    sudo rm -rf -- "$@"
  else
    rm -rf -- "$@"
  fi
}
if [ "$mode" = prepare ]; then
  # This project uses LLVM/Python/Node, not the large bundled mobile/.NET/Haskell SDKs.
  remove /usr/local/lib/android /usr/share/dotnet /opt/ghc /usr/local/.ghcup /opt/hostedtoolcache/CodeQL
  if [ "$dry_run" != --dry-run ]; then sudo apt-get clean; fi
else
  # Preserve release/site artifacts and reports. Includes partial compiler downloads
  # so failures also release space; Pages' downloaded/deployed copies are transient.
  for path in .deps .venv build/toolchain23 build/tmp build/generated firmware/build web/dist/studio web/dist/firmware-ui build/download build/deploy; do
    remove "$root/$path"
  done
fi
if [ "$dry_run" != --dry-run ]; then df -h "$root"; fi
