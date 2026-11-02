# Development

All firmware, website, tools and instructions are experimental and used entirely at your own risk. [Risk notice](../RISK.md).

## Bootstrap

Use Python 3.12+, Node 22, Git, Ninja, CMake, dtc, protoc and LLVM/LLD. The release toolchain is pinned in toolchain.lock.json; local alternative compiler versions are recorded in provenance and are not the same release candidate.

```sh
python3 tools/bootstrap.py
sh tools/build_edge_zmk.sh --ble-studio
sh tools/build_edge_studio_ui.sh
.venv/bin/python tools/package_release.py --site-base ''
```

Bootstrap verifies detached public Git revisions and installs locked Python/npm dependencies. --cache accepts an optional local directory of Git repositories as a network accelerator; it is not a private build input. No vendor installer or stock image is required.

Run `node --test web/tests/*.test.js`, `PYTHONPATH=src .venv/bin/python -m unittest discover -s tests`, and `.venv/bin/python tools/audit_publication.py`. With the BLE build present, run `EDGE_TEST_BUILD=lofree_edge-ble-studio .venv/bin/python tools/test_edge_ble_delayed_dma.py` and the boot/import emulator tests.

Emulator retained slots use this project's own firmware as a synthetic fixture. They test compiled behavior and flag transitions, **not** real vendor-image recovery. Actual stock recovery remains a separate hardware observation, not a guarantee.

## Website

EDGE_SITE_BASE is empty for localhost and /lofree-edge-zmk for GitHub Pages. Build Studio and package the site with the same value. Serve build/site's parent for subpath QA or serve the localhost build/site directory directly. Never expose repository/private directories.

The isolated `tools/build_edge_studio_preview.py` fixture cannot access hardware and is excluded from published packages. Use it for locked, read-failure, delayed-response and editing QA. Do not reload a user's active installer/editor.

## Source and licenses

Source lives here; .deps, build, firmware/build and generated Studio/catalog files are ignored. Board source transformations are hash-pinned. Preserve upstream licenses and update ATTRIBUTION.md when adding tools or libraries. Packaging creates dependency notices and a corresponding-source archive.

## Supported compiler

Release builds use the checksum-pinned official LLVM 23.1.4 distribution. LLVM 18.1.8 compiled and passed image conversion checks but the compiled emulator entered the fatal handler on add-layer; it is not supported for this release. Do not bypass the compiled Studio/BLE tests or assume a successful compiler exit proves a working image.

Packaging reads compiler/version/hash provenance recorded at build time. It refuses a mismatched compiler or stale image metadata. Root browser modules are version-named in packages so an update cannot mix native ESM files from different releases.

Studio read-progress QA: use “Pause mapping reads” for the initial unknown-total
phase, then “Pause action reads” and “Read next action” to observe completed
responses advancing the determinate bar. The15s timeout must replace both bar
and skeleton with Retry; released late replies must not revive the old read.
These controls exist only in studio-qa and cannot access hardware.

## Frontend architecture

Both workspaces use the same pinned React/Vite toolchain from Studio's locked
dependencies. Firmware uses JSX in `web/firmware/`; Studio uses TypeScript/TSX
in the pinned upstream staging tree plus `web/studio-extension/`.

Firmware components own the installer, stock key editor, tabs and dialogs.
`workspace.js` exposes a subscribable device controller with no DOM rendering;
React reads it through `useSyncExternalStore`. Stock maps are read from the
keyboard on connection; only pending drafts live in page memory. Protocol,
image validation and OTA packet modules remain in `web/dist/` unchanged.

The shared banner/navigation remain framework-neutral Web Components in
`edge-shell.js`, with shared typography/tokens in `edge-design.css`; standalone
risk/roadmap pages use them too. React does not introduce a second design system.

`tools/build_edge_firmware_ui.py --base ''` builds Firmware only. Packaging calls
it automatically with the requested site base. Its generated `web/dist/index.html`
and `web/dist/firmware-ui/` are ignored; corresponding source is `web/firmware/`.
Build Studio with the same base before packaging. The old imperative page and
firmware controllers are removed.

`tools/build_edge_firmware_ui.py --preview --base ''` creates synthetic-only
`firmware-qa`. `tools/build_web_preview.py --site build/site --base /lofree-edge-zmk`
stages both mock workspaces under `build/qa-site/lofree-edge-zmk/`. Serve only
that public QA root. QA bundles are excluded from release output by both the
packager and publication audit. Browser checks must not use a real device.

## Studio security extension

See [security.md](security.md) for policy, additive RPC fields and schema.
`stage_edge_security.py` hash-checks and derives the upstream core hook without
editing dependencies. `test_edge_security_emulator.py` uses compiled firmware
and synthetic flash only. Security warnings inspect the live current keymap
across all layers, including unsaved changes; they are not browser-cached maps.
