# Releases

> **EXPERIMENTAL — ENTIRELY AT YOUR OWN RISK.** No warranty. Firmware can make the keyboard unusable and recovery may fail. Read [RISK.md](../RISK.md).

Use main as the default branch. VERSION is canonical SemVer, initially 0.1.0-alpha.1. Firmware, UI, CLI and release artifacts share it; upstream versions are separate. For 0.x development, incompatible changes increment the minor version, fixes increment patch, and candidate changes increment alpha.N. Describe persistent-settings changes and required exports/resets explicitly.

1. Merge reviewed source into main and run clean CI. Update VERSION, Python's PEP 440 equivalent, roadmap and release notes together.
2. Push an annotated v<VERSION> tag pointing to a commit on main. The workflow validates both and builds a draft release with OTA, ELF, website, source, notices, checksums and provenance.
3. Download and review those exact artifacts. Verify source completeness and licensing. Any unresolved redistribution issue blocks publication.
4. Test the exact OTA SHA on hardware, recording typing, USB, BLE pair/reconnect, layers/save/power cycle, Fn/media, Caps on/off, backlight, trial/acceptance and retained-image return. New metadata means a new hash: previous tests are not automatically inherited.
5. Complete the hardware checklist in the draft release notes with the exact SHA. Clearly record untested items; do not publish if required installation/recovery tests are incomplete. Do not accept firmware without a separate informed hardware handoff.
6. Manually publish the draft as a prerelease. The Pages workflow downloads the already-built website archive from that release; it does not rebuild or deploy development pushes. It requires matching release metadata and completed hardware-check markers.

Every release remains used entirely at the user's own risk. Successful testing is evidence for the tested device, not a guarantee. Do not move a published tag or silently replace assets. Fix mistakes in a new version and retain the original source/checksums.

Before launch, enable Pages via Actions, private vulnerability reporting, and main branch protections requiring CI. Create linked roadmap issues with tools/sync_roadmap_issues.py only after reviewing its dry-run output.
