# Power management bring-up

Experimental; firmware, tools and instructions are used entirely at your own risk. [Risk notice](../RISK.md).

This feature is under development on `firmware/power-management`, tracking [issue #2](https://github.com/jc-tanedo/lofree-edge-zmk/issues/2). Alpha.2 has fixed idle backlight shutoff and no validated low-power sleep. Nothing here certifies a new image for hardware or publication.

## Policy and Studio

A project-specific additive core RPC extension uses the existing Studio connection, framing, mutex and physical unlock. Get uses core request 16; Set uses 17; response 16 is EdgePower. Fields 1–7 are schema, dim seconds, off seconds, Bluetooth sleep seconds, dim percentage of requested brightness, capabilities, and status. Core fields 1–4 are unchanged. Old firmware's no-response is treated as unsupported; no second serial/HID reader is opened.

Schema 1 defaults: dim after 30 s, off after 120 s, sleep after 900 s, dim to 20%. Every deadline is measured from last key activity; zero is Never. Active deadlines must be ordered; range 0–86400 seconds; dim 0–100%. Dimming multiplies requested brightness and never turns on manually disabled lighting. Physical held positions, nonzero HID reports, queued behavior work and writes inhibit Bluetooth sleep. Settings are one versioned CRC-protected TLSR settings-log value; save only on explicit user action and read back after saving. Unknown newer schemas are not overwritten. Power defaults affect no keymap or bond.

ON retains USB/Studio and uses lighting timers. BT uses retained suspend while its encrypted link is ready; while advertising it uses pad-wake deep sleep after the configured timeout (pairing gets at least 60 s). USB power in BT does not suppress its policy. OFF enters selector-only deep sleep after a 20 s startup holdoff. USB-host suspend in ON inhibits lighting and uses pad/core/timer wake with remote-wake requests only when the host permits it. Both paths remain unvalidated on hardware. Deep wake reboots and may consume the wake key; retained suspend is intended to deliver the wake key, pending hardware validation. Selector policy remains authoritative.

## Stock reference and source boundary

Offline V0116 analysis corroborated six row wake pads PC5/PC4/PC3/PC2/PC0/PB7 and selector PD5/PD6 at 0xa124/0xa278. Its deep path 0xb050 inhibits PB4 and sets all 15 column pulls to 100 kΩ pulldown, then disables their outputs. Connected idle 0x8734 uses pad+timer wake with a 400 ms target; USB-suspend 0xfb34 uses pad+USB-core wake. These are static findings, not physical wake/current evidence. The actual low-level callback entry is 0x24d4, not the preceding trampoline 0x24d0. PD7 is a conditional additional wake source whose purpose remains unknown and is left untouched. A bounded search did not establish stock-editable separate dim/off timers.

Proprietary inputs and decompiler excerpts remain outside this repository. Our board setup is original code using public TC32 APIs. Upstream immutable checkouts are staged with reviewed hashes. Shared PB5/Caps gating remains inhibited while scanning sleeps. Radio registers/TX level are restored by upstream retained-suspend hooks.

## Memory and gates

The first memory reduction was rejected by compiled stack-sentinel tests. Capturing peaks **before** resets then found that initial Studio encoding used 1712 of 1800 bytes (84 spare); later snapshots had hidden that peak. Studio now reserves 2048 bytes. Main/IRQ/USB/OTA/work remain 768/896/768/1152/1536 bytes; idle remains 384. The queued-behavior buffer is 16 entries to fit this allocation; macro support is still outside the advertised feature set. Layers and Bluetooth profiles remain three.

The new build uses 22316/22528 bytes of static RAM. Every reset in the power/storage tests is now preceded by a watermark check, and the final state is checked too. The gate requires at least 128 bytes spare in each observed stack. These checks and the complete regression suite must pass on the revised image before hardware handoff.

Required remaining coverage: compiled timer/PWM boundaries, held keys/deferred actions, version/corrupt record/write failure, locked RPCs, persistence, RF-loss resume, deep wake/trial guard, OFF/selector/cable states, browser loading/error/retry and dirty navigation, old firmware fallback, exact-SHA hardware tests and measured current. No battery-life claim before measurements. Measured battery reporting remains [issue #4](https://github.com/jc-tanedo/lofree-edge-zmk/issues/4).

## Validation so far

Portable C policy and actual shared TypeScript codec tests pass. The compiled power harness passed secured reads/writes, invalid ordering rejection, dim/off PWM transitions, manual-off preservation, held-key inhibition, restoration on activity, USB continuity and saved power/keymap/layer readback after reset on the prior integration image. The alpha.3 rerun also passed.

Isolated browser fixture checks passed: locked controls; defaults and save/readback; invalid ordering; rejected save retaining the draft; older firmware fallback; 15-second stalled read ending in a retry error; ignored late response; reconnect/retry; dirty navigation confirmation. These checks cannot access a physical keyboard. No browser console errors were observed in the exercised paths.

The backend is `CONFIG_TLSR_SETTINGS_LOG`, not NVS. It uses two journal areas in the storage partition, CRC-16 for each named record and commit-last area headers during compaction. Power settings add a versioned CRC-32 payload in one named record; the older value is invalidated only after the replacement is written. Atomicity is bounded by that upstream log implementation and flash behavior, not a recovery guarantee.

Power settings use a new `edge_power/config` namespace (schema 1), so upgrading from alpha.2 uses defaults without resetting saved mappings or bonds. Alpha.2 ignores this namespace. Future stored power schemas are read-only on schema-1 firmware. The UI and CLI use the canonical alpha.3 version; no release is published by this branch.

The current compiled image also passed encrypted connected wake with modeled radio-register loss, a key injected exactly at sleep entry, three actual pad wakes with first press/release reports, mode/legacy-output regressions, USB host suspend/core resume, and both BT/OFF deep-entry GPIO masks. These assertions do not simulate deep wake. The smallest reported connected-suspend stack margin was 148 bytes in idle; full regression requires at least 128 bytes spare in every observed stack.

## Known cold-wake limitation

On the tested alpha.3, Fn+F12 after connected sleep can miss its first action or
wake with a delay, including the Caps indicator in one trial. Ordinary battery
wake across all six rows was fast. This remains unresolved in [issue #13](https://github.com/jc-tanedo/lofree-edge-zmk/issues/13),
with refinement lower priority per the owner. Do not describe all Fn wake
behavior as validated. Existing modeled A latency coverage does not exercise
the entire physical Fn-plus-consumer sequence.

## Deep row-pull correction (not hardware-certified yet)

The scan driver chooses10k pull-ups for GPIO_PULL_UP. Preserving them with
deep-sleep100k column pull-downs leaves a closed key near91% VDD, so the row
may not reach LOW. Retained sleep drives columns low and did not have that
weak-pull problem. The corrected deep-only setup selects1M row pull-ups
(near9% VDD pressed); normal reboot restores the DTS scanning configuration.
The compiled-entry regression fails on the initial binary and passes with the
correction. No actual current or electrical wake is inferred from that model.
OFF selector wake and Never reconnect controls worked on the initial image.
