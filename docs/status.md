# Alpha.3 power management — remaining hardware gates

Branch `firmware/power-management`, draft [PR #12](https://github.com/jc-tanedo/lofree-edge-zmk/pull/12).
Installed OTA `145f81d269f030e2338f61662f1f8ceeaf1d5499d3f2c34791c6d88ab404131e`
is owner-authorized, self-tested and accepted/count0. Latest post-power-cycle
readback confirms retained-image size/CRC valid. Recovery remains unguaranteed.

## Exact-image results

Owner passes: ON typing/media/Caps/backlight/Studio, saved maps/layers and idle
lighting; manual stock return/reinstall; BT reconnect and USB isolation; connected
first-A and disconnected deep wake on battery; cable insertion policy; OFF
inactivity and selector wake on USB/battery; full-cycle maps/layers/bonds/power
settings persistence. Short test values2s/4s/10s/20% were used during validation;
owner restored defaults30s/120s/900s/20% and verified reconnect readback.

SET_IDLE change-only compatibility fix passes repeated OFF30s→ON: owner reports
prompt typing/Studio on both cycles; kernel descriptor→HID attachment gaps are
134.843/153.873ms and116.990/136.064ms, without previous5s waits. No exact
slider-to-ready stopwatch timing or new USB control capture is claimed.

Held-key inhibition, manual backlight-off preservation, invalid dim/off ordering
and all-timers Never controls also pass; short test values restored afterward.

## Pending and limitations

Physical USB-host suspend/resume passes on CachyOS without unplugging; owner
resumed using host controls and verified typing/media/indicators/Studio/settings.
Battery connected wake passes six sampled rows (Esc/1/Q/A/Z/Left Ctrl);
held Shift across both transport directions releases correctly. Exact-image
compiled tests establish legacy output-action immunity. Edge-initiated remote
wake is untested. Everyday defaults have been restored and read back. Fn/media cold wake
[issue13](https://github.com/jc-tanedo/lofree-edge-zmk/issues/13) is open and lower
priority. Deep wake consumes its first key. Current is unmeasured: owner has no
suitable instrument, so no battery-life/current savings are established.
See [exact-image record](validation/v0.1.0-alpha.3.md); previous image results
are archived separately and do not certify this binary.

## Software verification and UI

GitHub CI run41368704446 passed on edb4bd0. Local interrupted preflight resumed,
rebuilt the exact same OTA and completed exit0: compiled regressions, both site
bases and196-file source/history/archive/site audits. Frozen installer8785 and
its catalog/hash/26-link audits pass. Frozen snapshot remains unchanged.

Firmware source shows “✓ Connected” plus “Update interface connected” only
after verification, resetting on disconnect. Isolated mock browser QA passes.
Shared warning-banner source now uses requested “EXPERIMENTAL — USE AT YOUR
OWN RISK”; frozen8785 retains original copy. No release/tag/merge/Pages
publication is authorized by these observations.

# Released alpha.2 baseline

Physical-switch implementation is complete on `firmware/physical-mode-switch`,
Merged PR #10 / closed issue #3. Exact alpha.2 OTA SHA-256
`ee74d5411891418eb6b08621c2fc21175bbecbe70c65511476aac11c5326297e`
passed owner hardware validation on one Edge/CachyOS host and was previously
installed/accepted before the alpha.3 tests. See [the validation record](validation/v0.1.0-alpha.2.md).
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
