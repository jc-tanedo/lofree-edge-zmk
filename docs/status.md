# Publication status

Canonical source is this repository, main branch, VERSION 0.1.0-alpha.1. Vendor inputs/history are quarantined outside it in the workspace private directory. No private input is needed for builds.

Implemented: current README/comparison, illustrated guide, AI disclosure, linked attribution and generated dependency notices, GPL licensing, risk document, persistent risk banners, per-flash acknowledgment, JSON-backed roadmap, pinned public dependencies/compiler/actions, draft releases, and release-only Pages promotion with exact-SHA hardware gates.

Validation: 53 browser tests and 28 Python/publication tests pass. Official LLVM 23.1.4 builds the BLE/USB image; compiled USB/Studio/BLE, encrypted reconnect, persistence and stack tests pass. A reduced add-layer test fails with LLVM18, so LLVM18 is unsupported. No firmware behavior was changed to work around it. Build provenance records the actual compiler and output hashes.

Public packages use a single BLE+USB catalog, version-named root modules, corresponding source and standalone license notices. Source/history/archive/site audits and both hosted-path/localhost checks are required before upload. QA fixtures cannot access hardware and are excluded from artifacts.

Physical alpha testing is in progress for OTA SHA-256 c4df776d24cf11a4c0d9c4b1464486d663ff5ab1e4a93b877d593494749559b8. The owner verified typing, USB, Fn/media, Caps on/off, backlight, Studio edit/save, existing-bond reconnect, fresh BLE pairing/typing, manual retained-stock return, and reinstall of the same image. With explicit approval, the flash self-test passed and host acceptance cleared the boot count from 1 to 0. Final full-power-cycle mapping and BLE-bond persistence are awaiting owner confirmation. Do not publish a firmware release or Pages before that check passes.

The first real GitHub CI run exposed a Node 22 CLI incompatibility with --test-isolation=none; CI and developer instructions now use the portable node --test command. Optional acceptance tooling requires hid==1.0.8 (the upstream ctypes API), not the different hidapi Python binding. Corrected binding successfully read trial/retained-image state and performed authorized acceptance.
