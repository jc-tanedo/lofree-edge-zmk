# Roadmap

Experimental firmware and tools, used entirely at your own risk. [Risk notice](RISK.md).

Statuses describe work, not promised delivery dates. The completed core-feature item records earlier evidence, not validation of a new release.

## Release hardening

**completed** · First public prerelease

The first prerelease now has clean builds, package/license audits, hosted-path validation and exact-SHA hardware evidence; these gates remain required for future releases.

**Acceptance:** CI passes from a clean checkout; artifacts audited; exact OTA passes the hardware checklist before publication.

[Tracking issue](https://github.com/jc-tanedo/lofree-edge-zmk/issues/1)

## Sleep and power management

**in progress** · Power and mode handling

Functional idle lighting, Bluetooth suspend/deep wake, OFF wake and settings persistence are implemented and owner-tested on one Edge/CachyOS. PR #12 closes functional issue #2 on merge. Current measurements, Fn/media cold wake and consumed deep-wake key have separate follow-ups; no measured power or battery-life claim.

**Acceptance:** Persist and validate Studio timers; verify held-key/manual-off policy, ordinary wake/reconnect, mode/cable behavior, USB host resume and saved settings. Keep exact-SHA evidence separate from model tests and later focused changes.

[Tracking issue](https://github.com/jc-tanedo/lofree-edge-zmk/issues/2)

## Optional Studio physical unlock

**in progress** · Studio settings

Implemented in PR #12: default-on persistent unlock policy, Security tab, missing-binding warning and Save/enable guards. Both policy reboot modes and guards passed on the normal decoder image; later identity-only firmware received focused validation. Presence does not prove layer reachability. See [security details](docs/security.md).

**Acceptance:** Exact-image tests show default lock, disable/save/reconnect/reboot, re-enable/immediate lock and physical unlock, missing-binding warnings, retained maps/bonds/Power settings, ON-only Studio, and recovery/regression checks.

[Tracking issue](https://github.com/jc-tanedo/lofree-edge-zmk/pull/12)

## Draft-only keymap editing

**in progress** · Studio settings

Implemented in PR #12: edits/imports remain browser-local until Save, with counts, Undo/Redo, discard and conflict guards. Owner verified typing is unchanged before Save and browser draft/leave/reconnect checks pass on normal and identity-capable images.

**Acceptance:** No keymap writes before explicit Save; accurate counts and Undo/Redo; draft-only import/discard; guarded saves and conflict handling; reliable reconnect and navigation; hardware typing changes only after Save.

[Tracking issue](https://github.com/jc-tanedo/lofree-edge-zmk/pull/12)

## Studio read and USB framing reliability

**in progress** · Studio settings

Implemented in PR #12: bounded complete-frame decoding and response framing. Normal and identity-capable images each passed 1,786 read-only requests and browser reconnect/draft checks. Precise old streaming root cause and wider hardware/host coverage remain unproven.

**Acceptance:** Repeated initial connections, full action reads and navigation/reconnect succeed under host backpressure; complete frames and bounded disconnect handling pass regression tests; exact-image hardware validation passes.

[Tracking issue](https://github.com/jc-tanedo/lofree-edge-zmk/pull/12)

## Fn/media after connected sleep

**needs investigation** · Power and mode handling

Fn+F12 can miss its first volume action or wake with a delay in the unreleased alpha.3; ordinary row wake was fast. Lower priority per owner; not resolved.

**Acceptance:** Locate wake/layer/consumer-report timing and validate repeated full-idle Fn/media press and release on hardware with regression coverage; document host conditions.

[Tracking issue](https://github.com/jc-tanedo/lofree-edge-zmk/issues/13)

## Physical mode switch

**completed** · Power and mode handling

Implemented and owner-validated in the alpha.2 candidate: ON USB/Studio only, BT Bluetooth with USB power only, OFF inactive. One Edge/CachyOS validated; broader hosts and sleep remain separate work.

**Acceptance:** ON enables USB/Studio only; BT enables Bluetooth with USB power only; OFF suppresses input/radio/lighting/data. Verify guarded transitions, legacy-binding immunity, saved maps/bonds and cable/battery behavior on the exact image.

[Tracking issue](https://github.com/jc-tanedo/lofree-edge-zmk/issues/3)

## Measured battery reporting

**needs investigation** · Power and mode handling

The current battery report is a placeholder, not a measurement.

**Acceptance:** Identify sensing hardware, calibrate readings and validate charge/low-battery states against external measurements.

[Tracking issue](https://github.com/jc-tanedo/lofree-edge-zmk/issues/4)

## Hardware and host coverage

**planned** · Compatibility

Only one physical Edge and limited host configurations have been exercised.

**Acceptance:** Publish a device revision and host/browser matrix with typing, Bluetooth, USB, indicators, persistence and recovery evidence.

[Tracking issue](https://github.com/jc-tanedo/lofree-edge-zmk/issues/5)

## Wireless keymap editing

**needs investigation** · Future capabilities

Studio currently edits over USB only.

**Acceptance:** Establish browser/transport feasibility and secure unlock; demonstrate read, edit, save, disconnect and recovery without USB.

[Tracking issue](https://github.com/jc-tanedo/lofree-edge-zmk/issues/6)

## More than three layers

**deferred** · Future capabilities

Current firmware reserves three total layers; retain this limit for the first release.

**Acceptance:** Measure RAM/flash/storage costs and test save/load/import and upgrade compatibility before raising the limit.

[Tracking issue](https://github.com/jc-tanedo/lofree-edge-zmk/issues/7)

## Broader behaviors and lighting

**deferred** · Future capabilities

The current UI supports advertised behaviors; custom shortcut presets are not a macro engine and lighting is limited.

**Acceptance:** Select concrete behavior/effect additions, validate live metadata and runtime editing, and document memory/compatibility costs.

[Tracking issue](https://github.com/jc-tanedo/lofree-edge-zmk/issues/8)

## Core typing, layers and indicators

**completed** · Existing evidence

Earlier private builds were physically tested on one keyboard; this is not new-candidate certification.

**Acceptance:** Typing, Fn/media, Caps fully on/off, backlight toggle/brightness and layer persistence demonstrated on the tested device.

Tracking issue will be linked after the public repository is created.

## Firmware updates directly from running ZMK

**needs investigation** · Future capabilities

The supported web installer currently returns to stock for its USB update interface. Reuse of existing TC32 OTA/boot-guard machinery needs assessment; direct ZMK updates are not yet a supported browser flow.

**Acceptance:** Document feasibility, flash/slot and settings constraints; if implemented, validate image checks, interruption behavior, explicit consent, unconfirmed trials, retained recovery and exact-SHA hardware updates before release.

[Tracking issue](https://github.com/jc-tanedo/lofree-edge-zmk/issues/14)

## Verified one-step firmware installation

**in progress** · Release hardening

Implemented and physically tested in PR #12: guided upload/restart/identity verification/self-test/acceptance, permission handoff and verification-only resume. Finalize action is inside its step. Public approval registry remains empty pending release review; unapproved builds stay trials.

**Acceptance:** Exact approved builds upload/reconnect/verify/self-test/accept/readback; interruption resumes verification without reupload; development builds remain trials. Record exact-image installation evidence and satisfy separate release approval gates.

[Tracking issue](https://github.com/jc-tanedo/lofree-edge-zmk/pull/12)

## Measured sleep current and power savings

**blocked** · Release hardening

No suitable current-measurement equipment is available. Functional sleep tests do not establish power savings; the measured-current release gate remains required.

**Acceptance:** Measure active/dim/off, connected suspend, advertising/deep sleep, OFF and USB suspend current with documented setup, exact SHA and repeatability; investigate unexpected consumption before battery-life claims.

[Tracking issue](https://github.com/jc-tanedo/lofree-edge-zmk/issues/15)

## First key after disconnected deep wake

**needs investigation** · Power and mode handling

Deep wake reboots and consumes the wake key. Tested reconnection completes within a few seconds without re-pairing; ordinary connected wake is separate.

**Acceptance:** Assess reliable press/release preservation across reboot/reconnect, add actual-seam tests and physical validation, or document why the first key must remain wake-only.

[Tracking issue](https://github.com/jc-tanedo/lofree-edge-zmk/issues/16)
