# Licensing and redistribution

Original project contributions are licensed under **GPL-3.0-or-later**, except files retaining an explicit existing license such as MIT. Preserve those notices. This repository does not relicense third-party code.

The TC32 portion of zmk-tc32 is GPL-3.0-or-later; its compatibility portion is Apache-2.0 and upstream ZMK is MIT. Zephyr is primarily Apache-2.0 with per-file exceptions. Studio is Apache-2.0. Read each dependency's actual license and notices; a top-level license is not a substitute for a file-level audit.

Releases include corresponding source with the pinned upstream trees, project changes and build scripts, plus bundled frontend dependency source and license files. Generally available compiler/build tools are identified by version and upstream URL. Dependency source hashes and tool versions are recorded in provenance.

The firmware contains source-backed TC32 startup/flash routines; build checks compare their bytes with the upstream source metadata. Proprietary Lofree images, repair sectors, SDK binaries and vendor applications are excluded. Any newly discovered unclear redistribution rights block the affected release.

Required upstream license texts are copied to the release's licenses directory. Generated dependency notices describe the exact installed frontend packages. [Attribution](ATTRIBUTION.md) also credits development tools that are not redistributed.

All materials are experimental and used entirely at your own risk. See [RISK.md](RISK.md) and [GPLv3](LICENSE).
