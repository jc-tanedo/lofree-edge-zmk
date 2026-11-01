# Publication status

Canonical source is this repository, main branch, VERSION 0.1.0-alpha.1. Vendor inputs/history are quarantined outside it in the workspace private directory. No private input is needed for builds.

Implemented: current README/comparison, illustrated guide, AI disclosure, linked attribution and generated dependency notices, GPL licensing, risk document, persistent risk banners, per-flash acknowledgment, JSON-backed roadmap, pinned public dependencies/compiler/actions, draft releases, and release-only Pages promotion with exact-SHA hardware gates.

Validation: 53 browser tests and 28 Python/publication tests pass. Official LLVM 23.1.4 builds the BLE/USB image; compiled USB/Studio/BLE, encrypted reconnect, persistence and stack tests pass. A reduced add-layer test fails with LLVM18, so LLVM18 is unsupported. No firmware behavior was changed to work around it. Build provenance records the actual compiler and output hashes.

Public packages use a single BLE+USB catalog, version-named root modules, corresponding source and standalone license notices. Source/history/archive/site audits and both hosted-path/localhost checks are required before upload. QA fixtures cannot access hardware and are excluded from artifacts.

User selected preparing the alpha hardware test now. Next: freeze this commit, build/package the exact candidate, finish all independent checks, then request a stock handoff. No physical alpha flash or acceptance has occurred. Do not publish a firmware release or Pages until its exact SHA passes the documented hardware checklist.
