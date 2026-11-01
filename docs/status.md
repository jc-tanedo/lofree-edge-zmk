Power-management implementation is in progress on `firmware/power-management`.
Canonical version is now unreleased `0.1.0-alpha.3`; alpha.2 remains installed.
Studio Power supports device reads, dim/off/sleep timers, relative dim brightness,
Never, validation, explicit save/readback, defaults/discard, old-firmware fallback,
timeout/retry and dirty navigation guards. Isolated browser checks pass.

The compiled prior alpha.3 integration passed secured settings/PWM/held-key/manual-off
and reboot persistence; encrypted BLE suspend/pad wake x3 and all mode/legacy-output
regressions passed with stack margins >=128 bytes. Additional checks passed for
RF-register loss on suspend, a key racing with entry, USB-host suspend and BT/OFF deep
entry. Storage fault-injection validation and full CI remain in progress. Deep wake/current are not modeled; physical hardware tests remain mandatory.
The first trimmed stacks failed tests. An additional pre-reset peak check found
Studio1712/1800 (84 spare); its allocation is now2048 with a16-entry behavior queue.
Current build uses22316/22528 static RAM, with three profiles/layers.
See [power management](power-management.md). No hardware writes performed.

# Current status

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
