# Sleep and power management

Experimental firmware, website, tools and instructions. Use at your own risk. [Risk notice](../RISK.md).

Implemented in unreleased alpha.3, [PR #12](https://github.com/jc-tanedo/lofree-edge-zmk/pull/12). Functional [issue #2](https://github.com/jc-tanedo/lofree-edge-zmk/issues/2) closes on merge; release approval is separate.

## Policy and Studio

The Power tab stores dim, lights-off and Bluetooth sleep deadlines plus relative dim brightness on the keyboard. Defaults are 30 / 120 / 900 seconds and 20%. Each deadline is measured from last key activity; zero means Never. Active deadlines must be ordered, timers range 0–86400 seconds, and brightness ranges 0–100%. Dimming multiplies requested brightness and never enables manually disabled lighting. Physical held positions, nonzero HID reports, queued behavior work and writes inhibit Bluetooth sleep.

ON retains USB/Studio and uses lighting timers. BT uses retained suspend while its encrypted link is ready; while advertising it enters pad-wake deep sleep after the configured deadline (pairing gets at least 60 seconds). USB power in BT does not suppress sleep. OFF enters selector-only deep sleep after a 20-second startup holdoff. USB host suspend in ON inhibits lighting and uses pad/core/timer wake; remote-wake requests are gated by host permission. Physical Edge remote wake is not validated.

Connected retained suspend delivered sampled ordinary first taps promptly. Disconnected deep wake reboots, consumes its wake key and reconnects within a few seconds without re-pairing on the tested host. Fn/media connected cold wake can miss or delay its first action. These are documented limitations, not passing checks for all wake behavior.

## Protocol and storage

Project-specific additive core requests 16=get and 17=set reuse the existing secured Studio connection, framing and mutex; response 16 is EdgePower. Fields 1–7 are schema, dim seconds, off seconds, Bluetooth sleep seconds, dim percentage, capabilities and status. Core fields 1–4 are unchanged. Older firmware's missing response is treated as unsupported; no second serial/HID reader is opened.

Schema 1 uses one versioned CRC-32 payload in `edge_power/config`. Save occurs only on explicit user action, followed by readback. Unknown newer schemas cannot be overwritten; Power defaults reset neither keymaps nor bonds. The backend is `CONFIG_TLSR_SETTINGS_LOG`, not NVS: two journal areas, CRC-16 named records and commit-last area headers. Older values are invalidated only after replacement writes. Atomicity depends on upstream storage and flash behavior, not a recovery guarantee. Alpha.2 ignores this new namespace; upgrading reads stored settings or defaults.

## Stock reference and source boundary

Offline V0116 analysis corroborated six row wake pads PC5/PC4/PC3/PC2/PC0/PB7 and selector PD5/PD6 at 0xa124/0xa278. Its deep path 0xb050 inhibits PB4 and sets all 15 column pulls to 100 kΩ pulldown, then disables their outputs. Connected idle 0x8734 uses pad+timer wake with a 400 ms target; USB-suspend 0xfb34 uses pad+USB-core wake. These are static findings, not physical wake/current evidence. The actual low-level callback entry is 0x24d4, not the preceding trampoline 0x24d0. PD7 is a conditional additional wake source whose purpose remains unknown and is left untouched. A bounded search did not establish stock-editable separate dim/off timers.

Proprietary inputs and decompiler excerpts remain outside this repository. Our board setup is original code using public TC32 APIs. Upstream immutable checkouts are staged with reviewed hashes. Shared PB5/Caps gating remains inhibited while scanning sleeps. Radio registers/TX level are restored by upstream retained-suspend hooks.

## Wake and USB corrections

Deep entry uses 1 MΩ row pull-ups against 100 kΩ column pulldowns with outputs disabled. Retaining the scan driver's 10 kΩ pull-ups would nominally leave a pressed row near 91% VDD; the deep-only correction yields about 9%. Normal boot restores scanning pulls. Compiled register tests and physical key/deep-wake tests are separate evidence; divider estimates are not current measurements.

Linux HID startup previously waited roughly five seconds for zero-duration/report-zero SET_IDLE requests. A narrow reviewed Zephyr transformation accepts this change-only mode without SOF support; periodic nonzero idle remains unsupported. Owner OFF→ON tests became prompt, with descriptor-to-HID attachment intervals of approximately 117–154 ms on the USB-startup candidate. This is not a stopwatch measurement of slider-to-typing latency.

## Memory and regression coverage

BLE/Studio stack allocations are main 768, IRQ 896, USB 768, OTA 1152, work queue 1536, Studio 2048 and idle 448 bytes. Three layers/profiles and a 16-entry behavior queue are retained. Compiled tests capture stack peaks before resets and require at least 128 bytes observed margin. This does not prove every possible workload fits.

Tests cover timer/PWM boundaries, held/deferred input, failed/corrupt/future settings, secured RPCs, persistence, encrypted retained suspend with radio-register loss, sleep-entry races, deep-entry GPIO masks, OFF/selector/cable policy, host suspend/core resume and stack margins. Browser fixtures cover loading/progress, errors/timeouts/retry, old-firmware fallback and dirty navigation. Models are not physical deep wake or current measurements.

## Physical evidence and follow-ups

The [normal decoder record](validation/v0.1.0-alpha.3-complete-frame.md) ties the full functional matrix to OTA `5b53224452589907eeafd485b294800023bbf5114746f1feebb9230e8cc8ff5b`: Power controls, ordinary row wake, battery/BT/OFF/USB behavior, persistence, modifiers and host resume passed on one Edge/CachyOS host.

Later identity and wizard changes received [focused exact-image validation](validation/v0.1.0-alpha.3-browser-identity.md), per owner request, without repeating unrelated sequences. Earlier results do not certify changed binaries. The current accepted image is `afa70869c44ad586ab02ae543652acf7d54125a8bd2c99a18e5b9688d251ef69`. Custom Power settings were restored and read back; exact values were not supplied.

Separate roadmap items track [measured current #15](https://github.com/jc-tanedo/lofree-edge-zmk/issues/15), [Fn cold wake #13](https://github.com/jc-tanedo/lofree-edge-zmk/issues/13), [deep-wake first key #16](https://github.com/jc-tanedo/lofree-edge-zmk/issues/16), [battery sensing #4](https://github.com/jc-tanedo/lofree-edge-zmk/issues/4) and [hardware/host coverage #5](https://github.com/jc-tanedo/lofree-edge-zmk/issues/5). No measurement equipment is available. Current draw and battery life remain unmeasured; the measured-current release gate remains required. No release or Pages deployment follows from merging this PR.
