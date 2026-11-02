# USB startup candidate installed — baseline pending

Owner installed frozen OTA145f81d269f030e2338f61662f1f8ceeaf1d5499d3f2c34791c6d88ab404131e.
Read-only info confirms trial boot1, unconfirmed, slot B, retained-image size/CRC
valid. Do not restart/move selector during initial checks; acceptance is separate.
Shared warning-banner source now reads “EXPERIMENTAL — USE AT YOUR OWN RISK”
per owner request, across Firmware and Studio. Frozen8785 snapshot is unchanged.

# USB startup candidate — preflight passed, ready for hardware handoff

GitHub CI [run41368704446](https://github.com/jc-tanedo/lofree-edge-zmk/actions/runs/41368704446)
passed on commit `edb4bd001f9bb9881126b263f4744a6f3060d2b5`. Local preflight was
interrupted by shutdown, then resumed from the unfinished stack/storage tests
with an exact-hash rebuild. Remaining checks completed with exit0, including
boot/import/diagnostic tests, both website bases and source/history/archive/site
audits (196 source files). Installed firmware has not changed.

Frozen candidate OTA `145f81d269f030e2338f61662f1f8ceeaf1d5499d3f2c34791c6d88ab404131e`
is served separately at `http://127.0.0.1:8785/lofree-edge-zmk/`, labeled
“HARDWARE TEST alpha.3 — USB startup SET_IDLE correction”. Its copied site passes
independent audits and26 local-link checks; browser confirms selected label,
verified image, disabled install while disconnected and visible risk notice.
Frozen bytes match the catalog. All independent preflight work is finished.
No physical pass, flash or acceptance is implied for this candidate.

# Alpha.3 power management — hardware validation in progress

Branch `firmware/power-management`, draft [PR #12](https://github.com/jc-tanedo/lofree-edge-zmk/pull/12).
Installed and accepted corrected candidate OTA SHA-256:
`46cb8d6ca7d1c886a37d456c84ae4c1403f0cf23dc39b9901de45131d6e14f53`.
Owner-authorized flash self-test and separate accepted/count0 readback passed.

Owner checks pass on that exact image: ON typing/media/Caps/backlight/Studio,
saved maps/layers, 2s/4s/10s/20% settings and dim/off/restore; manual stock
return/reinstall; connected idle first-key wake and disconnected deep wake on
USB power and battery; cable insertion respecting BT-only policy; OFF inactivity
and selector wake with/without USB; full-cycle saved settings/maps/bonds.
Disconnected deep wake takes a few seconds and consumes the wake key without
re-pairing. See [installed-image hardware record](validation/v0.1.0-alpha.3-deep-wake.md).

## USB startup delay — candidate fix, not installed

Owner reported OFF→ON typing/Studio delay. Two cue-based captures measured
USB visibility at6.854s/2.504s (human reaction included), with typing estimates
4s/5s. Kernel records show approximately5s HID attachment waits. A filtered
USB control capture identified SET_IDLE(duration0/report0) on interfaces2/3
cancelled after5245.682ms/5026.347ms. Private raw metadata stays outside source.

Pinned Zephyr rejects SET_IDLE without SOF. New reviewed source staging accepts
only duration0/report0 change-only mode; periodic idle remains unsupported.
Compiled regression fails on installed image (STALL), passes after patch.
The model does not reproduce silicon stall timing. New local build OTA SHA:
`145f81d269f030e2338f61662f1f8ceeaf1d5499d3f2c34791c6d88ab404131e`
(121044 bytes, static RAM22316/22528). Broader preflight and new exact-image
hardware gates remain required. Frozen8783 installer and installed firmware
are unchanged. No further flash/acceptance authorized yet.

## Remaining limits

[Fn+F12 cold wake](https://github.com/jc-tanedo/lofree-edge-zmk/issues/13) remains
open and lower priority. Physical USB-host suspend, broader matrix/modifier
coverage and remaining checklist cases are pending. No current-measurement
hardware is available; no power-draw or battery-life improvement is established.
No release/tag/merge/Pages publication is authorized by these checks.

# Released alpha.2 baseline

Physical-switch implementation is complete on `firmware/physical-mode-switch`,
Merged PR #10 / closed issue #3. Exact alpha.2 OTA SHA-256
`ee74d5411891418eb6b08621c2fc21175bbecbe70c65511476aac11c5326297e`
passed owner hardware validation on one Edge/CachyOS host and is installed and
accepted (count 0). See [the validation record](validation/v0.1.0-alpha.2.md).
ON enables USB/Studio only; BT enables BLE with USB power only; OFF suppresses
input/radio/lighting/data. Three profiles remain. Mode movement briefly restarts
firmware; saved maps/layers/bonds survive. Legacy output actions are ignored.

Hardware coverage includes ON/BT/OFF, battery and cable insertion/removal,
Shift held across both transport transitions, fresh pairing, saved-profile
reconnect after OFF/unplug5s/reconnect, Studio save/persistence, indicators,
manual stock return/reinstall and explicitly approved flash self-test/acceptance.
No RF sniffer or current/supply measurement is claimed. Retained recovery is not
a guarantee. Sleep, measured battery reporting and broader host coverage remain
in the [roadmap](../ROADMAP.md).

The source UI now caps Bluetooth selection/import to indices 0..2: pinned native
metadata reports PROFILE_COUNT as an inclusive maximum, despite the runtime
rejecting that index. This compatibility clamp does not widen advertised limits
or change firmware. The firmware bytes match the owner-tested image. Output actions are hidden from both Functions and Advanced; existing saved
bindings remain readable/importable for compatibility. UI/package CI passed on final feature head9043e86.

GitHub CI passed for final feature head9043e86; local compiled GPIO/USB/Studio/BLE,
encrypted reconnect, all4 output actions, importer and trial rollback tests pass
for the exact OTA above. Source/history/site/archive audits and hosted subpaths
passed. Required compiler is pinned LLVM23.1.4. Optional device tooling needs
Python hid==1.0.8 plus the system HIDAPI library, not the different hidapi binding.

Release version is v0.1.0-alpha.2; its exact-image hardware checklist is recorded.
Version tags create drafts; publication requires artifact and hardware review. Pages promotion must use
the already-built matching website archive. Vendor inputs remain outside this
repository; clean public builds require no proprietary files. Preserve upstream
notices and conspicuous own-risk messaging.

OFF→ON clarification: owner estimates 5–10 seconds, with USB typing and Studio
returning together. Delay remains unresolved. A private read-only cue/USB
enumeration probe is prepared to distinguish host enumeration timing from later
HID readiness; it has not yet reproduced or diagnosed this delay.

Timing probe: USB enumeration 6.854s after the ON cue (human reaction included),
owner typing estimate 4s. This refines the earlier 5–10s estimate but does not
establish firmware boot latency or the cause. A read-only uptime query was added
to the private probe to separate pre-boot delay from later USB readiness.

Second timing capture: USB visible at 2.504s after cue, owner typing estimate
5s; immediate info returned no status (interface not yet ready). Kernel timing
shows descriptors→keyboard HID attachment ranging about0.11–5.62s, followed
by vendor HID attachment roughly5.04–5.18s later. This supports investigating
USB HID control-request initialization; it does not establish the exact failing
request or root cause. No firmware fix has been made for startup delay.

## Firmware connection feedback

Isolated browser QA with simulated HID confirms verified connection changes the
button to “✓ Connected” and header to “Update interface connected”; disconnect
restores both. Persistent risk notice stays visible. No hardware was opened.
The first inline preview mock was blocked by CSP and its tab was closed; external
mock module then provided the verified simulation. Existing six web tests pass.
