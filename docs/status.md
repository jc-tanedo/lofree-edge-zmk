# Power management — in progress

Branch `firmware/power-management`, draft [PR #12](https://github.com/jc-tanedo/lofree-edge-zmk/pull/12).
Version `0.1.0-alpha.3` is unreleased. Firmware candidate SHA-256
`3b233eba7abec417b946df30cb474f34de15d3ff82c2b9eb3a48a36a868062fd`
was installed by the owner and remains an unconfirmed trial.

**Hardware validation is incomplete:** the owner reports about one second of
Bluetooth wake delay. A first-key loss was initially reported, but a later
single-tap capture produced one letter and two notifications, consistent with
press/release. That sample does not reproduce first-key loss. Its filter omitted
timing headers, so it cannot establish latency or link state. A timed warm/idle comparison delivered both taps; its cue-to-report delays
include human reaction and do not measure firmware latency. Retained sleep is
expected to keep Bluetooth connected. Caps-indicator sleep/wake observation is
the next physical check. Do not accept
or publish before the remaining physical gates are resolved. Agent-side
Bluetooth queries expose no named Edge and cannot establish host connection state.

Owner-confirmed ON checks pass: ordinary typing, media, Caps indicator,
backlight, saved mappings/layers, Power defaults/read/save and configured
2s/4s/10s/20% dim/off/restore, held-key inhibition and manual-off preservation.
Power now uses the existing Studio tab bar. Its component stays mounted across
tab changes so drafts and navigation protection remain intact. Both production
bases compile; isolated browser tab/draft/guard checks pass. The frozen 8781
hardware-test installer remains unchanged.

Full local CI and [GitHub CI](https://github.com/jc-tanedo/lofree-edge-zmk/actions/runs/41305111518)
passed for firmware commit `113357f9f9565ffa35fd0fb6f3ddf6282ef9cd8d`:
secured settings, failed writes/corrupt/future schemas, PWM/manual-off/held keys,
persistence, encrypted retained suspend with simulated RF loss, entry-race keys,
USB-host suspend/resume, BT/OFF deep-entry setup, boot guard/import/diagnostic
checks, both website bases and independent source/history/archive/site audits.
Deep wake and current are not modeled. These green checks do not override the
physical first-key failure. Studio has 332 bytes spare at its observed first-boot
peak with a 2048-byte allocation; static RAM is 22316/22528, behavior queue 16,
profiles/layers three. Earlier trimmed stack allocations were rejected by tests.

The owner has no current-measurement equipment. Draw, battery improvements and
the current-measurement release gate remain unverified. See
[power management](power-management.md) and the [hardware record](validation/v0.1.0-alpha.3.md).
No release, Pages deployment or acceptance has occurred.

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
