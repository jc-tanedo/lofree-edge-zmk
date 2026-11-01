# Publication status

Canonical development is this repository on `main`. The first experimental prerelease is [v0.1.0-alpha.1](https://github.com/jc-tanedo/lofree-edge-zmk/releases/tag/v0.1.0-alpha.1); the matching browser tools are hosted on [GitHub Pages](https://jc-tanedo.github.io/lofree-edge-zmk/). Everything remains entirely at the user's own risk; see [RISK.md](../RISK.md).

The exact OTA SHA-256 c4df776d24cf11a4c0d9c4b1464486d663ff5ab1e4a93b877d593494749559b8 passed the owner's physical hardware checklist, explicit flash self-test/acceptance, retained-stock return/reinstall, and mapping/Bluetooth-bond persistence after a full power cycle. See [the validation record](validation/v0.1.0-alpha.1.md). The installed alpha is accepted; no further device writes are needed for publication.

Pinned local and clean GitHub builds produce the same OTA bytes. Debug ELF hashes can differ between host environments and are recorded individually in provenance. All 53 browser tests, 28 Python/publication tests, compiled USB/Studio/BLE, encrypted reconnect, saved-map persistence, boot and importer tests pass. Source/history/archive/site audits and both localhost/project-subpath checks pass. Physical results cover one Edge and CachyOS host, not every revision or operating system.

Version tags create drafts only. Published release notes record the exact-image hardware checklist; Pages promotes the already-built, checksummed website archive. Main requires CI, including for administrators; force-push/deletion is disabled. Private vulnerability reporting is enabled. Current run/deployment state is visible in [Actions](https://github.com/jc-tanedo/lofree-edge-zmk/actions).

Vendor inputs/history remain outside the repository in the original workspace's private directory. Public builds require no proprietary inputs. LLVM18 is unsupported: its compiled add-layer behavior fails; use the pinned official LLVM23.1.4 toolchain and utilities. Optional acceptance tooling requires `hid==1.0.8` plus the system HIDAPI library, not the different Python `hidapi` binding.

Next work is in the [roadmap](../ROADMAP.md): sleep/power management, physical-switch integration, measured battery reporting, and broader hardware/host validation. Wireless editing and additional layers remain investigations/deferred work. Preserve upstream licenses, risk warnings, exact-SHA release gates, and private-material exclusions.
