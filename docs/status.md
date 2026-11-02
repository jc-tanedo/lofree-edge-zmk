# Enlarged idle stack — complete BLE regression passed

On OTA3fde7a03218f8886391c54a3476a56a48592b74c7147460f00a61982a0f13722,
the full delayed-DMA/lost-RF connected-sleep regression passed pairing, encrypted
wake/reconnect, mode routing/legacy-output immunity and >=128B stack guards.
Full-suite idle spare was212B; the narrowed same264B scheduler path independently
left180B. Security RPC/fault/reboot and USB SET_IDLE tests also passed. Remaining
Power/deep-entry/boot/import and package/site audits are still running in the same
local tools/ci.sh process, report build/reports/idle448-full-ci.log. Static RAM
22420/22528B,108B linker headroom. These are emulator checks, not hardware tests.

Runner Docker/Compose provisioning is still pending owner-side. No new image is
hardware-approved or installed. No push of the new firmware commits, merge, tag,
release or Pages deployment. Installed accepted145f81d2 remains unchanged.

# Runner build-argument feedback and narrowed stack validation

Owner's Docker build stops before download with silent test guards. Missing build
args are the leading explanation; architecture is the other early guard. Dockerfile
now names each missing argument or unsupported architecture explicitly. Runner
guide includes .env -> Compose build.args wiring; runtime env_file is insufficient.
Shell syntax and both missing-argument diagnostics pass locally. Full Docker image
build remains owner-side pending selected runner version/digest and external script.

New OTA3fde7a03218f8886391c54a3476a56a48592b74c7147460f00a61982a0f13722
passes narrowed encrypted connected wake with the same264B peak and180B idle spare.
The complete local CI is still running; full security RPC/fault/reboot tests passed.
No candidate handoff, keyboard write, merge or publication.

# Idle-stack cause isolated — enlarged-stack validation pending

Both complete BLE tracing and a narrowed synthetic bonded reconnect/wake probe
reproduce264B idle depth: wake rescheduling -> slice_reset -> clock timeout ->
integer division. This is real native stack demand, not the boot security event
or a watermark artifact. The384B allocation leaves116B after its sentinel.
Combined-build idle is now448B; the128B minimum guard is unchanged and no other
stack shrinks. New image/linker/full emulator validation is pending. D7 remains
withheld, installed145f81d2 unchanged; no hardware commands.

# Runner Dockerfile prepared

Owner supplied their Dockerfile; its FROM is already24.04 but the running image
was20.04 and its label stale. tools/runner/Dockerfile preserves docker user,
runner directory and external start.sh, installs build prerequisites and sudo,
corrects the label, checks the runner archive against a required supplied digest,
and removes apt/archive leftovers. Rebuild/recreate instructions preserve existing
registration configuration. Exact Python/Node/LLVM pins remain unchanged.
Docker build has not been run: existing start.sh and selected runner version/digest
were not supplied, and local Docker daemon access is unavailable. Owner must
rebuild/recreate runners before CI can exercise the new environment.

The first diagnostic wrapper reached pairing but stopped before power checks due
to its own missing tools import path. That wrapper path is corrected and its same
full test is rerunning; this is not evidence for a firmware fix. No keyboard writes.

# Self-hosted execution — provisioning required

Routing was exercised by CI41467710109 and41467874827. The registered image is
Ubuntu20.04, running unprivileged without sudo. setup-python cannot obtain pinned
Python3.12.12 there; prerequisite installation also cannot proceed. Requested
Ubuntu24.04 and root/passwordless-sudo provisioning from the owner. Do not relax
Python/toolchain pins or treat these failed runs as validation. Workspace cleanup
ran successfully even after setup failure. Installed firmware remains unchanged.

A local shortened suspend probe keeps212B idle margin and does not reproduce the
full BLE test's116B result. Full connected-path emulator-side SP tracing is running;
no firmware fix has been assumed. Its report is build/reports/ble-idle-calltrace.log.

# Resumed — self-hosted Actions routing

CI, draft release and Pages now target the registered self-hosted/Linux/X64 labels.
System prerequisites support root or passwordless sudo on Debian/Ubuntu.
Cleanup on self-hosted runners is limited to known transient paths under the
verified checkout; system SDK removal remains GitHub-hosted only. Shell syntax,
dry-run targets and environment/workspace guards checked locally. Runner execution
is pending. No keyboard writes or firmware changes; the idle-stack guard failure
below remains unresolved and d7e477c8 must not be installed.

# Restart handoff (historical)

Owner requested a restart break. Installed accepted145f81d2 firmware is unchanged;
no device operation/flash is running. Branch firmware/power-management, last
pushed commitbb3176a; documentation handoff is intentionally uncommitted.

Latest CI41462078397: pre-build disk cleanup, pinned compiler installation and
always-run final cleanup all passed. Validation failed on the BLE connected
sleep idle-stack guard: size384, used264, spare116B < required128B. Exact local
reproduction also fails; log build/reports/security-ble-idle-margin-red.log.
Command: TC32EMU_SUSPEND_RF=lost EDGE_TEST_BUILD=lofree_edge-ble-studio
EDGE_TEST_POWER_SLEEP=1 .venv/bin/python tools/test_edge_ble_delayed_dma.py
(on one shell line). Do not lower the guard or offer the d7e477c8 candidate for
hardware installation. Static RAM currently22356/22528B; no stack change made.
Earlier security/Power/USB-only passes did not cover this full BLE stack path.

Owner now requests self-hosted Actions runners. API confirmed three online Linux
X64 runners with labels self-hosted/Linux/X64. Workflow switch is NOT implemented
yet: all three workflows still use ubuntu-24.04. Current cleanup deliberately
skips self-hosted runners. Next: switch routing, retain SDK deletion only for
GitHub-hosted machines, scope any self-hosted cleanup to this job workspace,
and support the registered runners' prerequisites. No runner SDKs were changed.
Resume idle-stack diagnosis after respecting that new steering; no fix assumed.

# Actions disk cleanup — CI rerun pending

CI run41460825158 failed during pinned compiler extraction because the hosted
runner exhausted disk space, before project tests ran. CI and draft-release now
free unused bundled SDKs/apt cache before setup. CI/release/Pages each have an
always-run final cleanup for their own transient build/dependency/deployment
storage; release/site artifacts and reports are preserved. The shared script
skips local/self-hosted environments and rejects a mismatched workspace.
Guard and dry-run checks pass locally; real cleanup is exercised only on the
hosted runner. Firmware bytes and installed keyboard are unchanged.

# Optional Studio unlock — local checks passed; hardware pending

Branch `firmware/power-management`, draft [PR #12](https://github.com/jc-tanedo/lofree-edge-zmk/pull/12).
Security tab is beside Power. The persistent device policy defaults to requiring
physical unlock. Disabling requires confirmation; enabling immediately locks.
Both handlers retain upstream secured authorization. The independent CRC-protected
record fails closed on corruption/future schema and does not reset maps/bonds or
Power. Studio remains ON-only. Missing direct unlock-binding warnings cover the
current live map and enable confirmation; save/discard map edits before policy
changes. See [security details](security.md).

Corrected OTA SHA-256:
`d7e477c8db047a108c3a1b91a13b3b335e6fab2ab3996df8c7581a8f4d0333c7`
(121860 bytes), firmware source commit3a93287. Not installed, frozen for physical
test, or hardware-certified. The owner’s accepted145f81d2 image and frozen8785
are unchanged. Earlier hardware passes do not certify this changed binary.

Local corrected-image security tests pass secured get/set, invalid values,
storage failure/retry, disconnect/reboot persistence, immediate relock, corrupt
and future records, map/layer preservation and >=128B observed stack margin.
Power storage/all-reset stack and USB SET_IDLE regressions pass. A synchronous
boot notification overflow was reproduced twice with a sub-second test; a locked
control passed. Queueing notification on the existing work queue fixes it without
larger stacks; boot-sync busy guards re-enable. The full corrected tests pass.

37 Python tests,60 JavaScript assertions and both codec checks pass. Both site
bases pass30 local asset/navigation checks. Source/history/site/source+website
archive audits pass210 curated files; package refresh completed on3a93287.
Isolated browser checks pass cancel/disable/enable/immediate lock, both missing
binding warnings, and older-firmware unsupported messaging; no console errors.
Screenshot: build/reports/power/security-tab-preview.png (synthetic transport).

Production review Studio at localhost8766 includes Security; the installer’s
existing firmware/catalog is preserved. Save edits before manually refreshing.
No owner tab was reloaded and no real keyboard commands were sent. Old firmware
shows an explicit unsupported message. Exact-image policy/warning hardware
markers are now mandatory for promotion. Current measurement gate and Fn/media
cold-wake limitation remain. Latest security CI is pending; earlier React-only
CI run41454323494 passed on18ebd38. No merge/tag/release/Pages deployment.

# Firmware React migration — UI validation passed

Firmware is now a React JSX workspace using Studio's pinned React/Vite tree.
Components own installer, stock-key editor, tabs and native confirmation dialogs;
a DOM-free subscribable controller owns device operations. Original protocol,
image validation and OTA framing modules remain unchanged. Shared banner/nav,
design CSS and bundled font remain common with Studio. Old imperative entry,
app/firmware/tab controllers are removed; generated entry/chunks are ignored.

Hardware-free browser checks pass: verification failure/retry, prominent verified
connection, fresh risk acknowledgment after cancel/reopen, synthetic transfer
progress/locked controls/completion, stock auto-read/current maps, reset-selected
Apply state, unsaved navigation and destructive reset confirmation. No browser
console errors.60 JavaScript tests pass when run directly, including controller,
actual React-rendered confirmation markup and bounded transfer notification tests.
The Node file-level runner in this host did not expose individual results, so
direct execution was used for the evidence. No device commands or flashing.

Final localhost and hosted builds pass24 asset/runtime-resource/link checks each.
Hosted browser checks confirm correct script/Studio/image paths, verified image,
required checkbox and initially-disabled confirmation; no console errors.37 Python
tests pass; publication tests use the source fallback and actual React-rendered
ack/reset controls rather than searching generated static HTML for dialogs.
Publication audit passes201 curated files, Git history, website and source/website
archives. The final package refresh passed against code commit6351a96. The
production React review build is served at localhost8766; the owner’s loaded
page was not refreshed. Save edits before manually refreshing.
Installed firmware OTA
145f81d2… remains unchanged; its functional hardware record does not certify a
new physical install through this frontend. Release gates remain open.

# Risk-banner actual font mismatch fixed

Identical declared sizes were insufficient: Studio defined bundled Inter.woff2,
but Firmware named Inter without loading it and used a system fallback. The
actual same-link width differed144px vs150px at equal1185px content widths.
Matching text-size-adjust did not fix it. Shared CSS now declares the existing
bundled Inter face via relative studio/Inter.woff2; entry cache keys are v8.
Both pages then measure150px and their1265×134 banner screenshots have zero
pixel differences (Pillow ImageChops comparison). Prior typography-only check
missed the fallback and is superseded by this rendered verification. No font
was downloaded; existing Studio asset reused. No firmware/device changes.

# Shared risk-banner typography

Fresh Firmware/Studio tabs initially reported matching computed13px heading and
12px body/link sizes; the owner’s reported older-session difference could not
be reproduced. Shared CSS now explicitly controls family/weight/line-height and
child inheritance, with the shared stylesheet cache key bumped to v7 on both
entry points. Browser verification confirms identical computed typography and
v7 stylesheet on both pages. Banner screenshots are in build/reports/power/.
Owner’s active page is not reloaded; no device commands or firmware changes.

# Firmware stock-connection status emphasis

Verified stock connection now replaces the Connect action with a green status
panel: circled check, prominent “Connected”, and “Stock keyboard verified”.
Disconnect restores the action and header state. It appears only after interface
verification. Isolated hardware-free browser visual/disconnect checks pass;
screenshot build/reports/power/connected-status-card.png. Six web tests pass.
Owner’s live page is not reloaded and no device commands are sent.

# Studio mapping-read progress and risk banner

Shared Firmware/Studio banner uses “EXPERIMENTAL — USE AT YOUR OWN RISK”.
Studio retains skeletons and now shows read phases, then measured progress after
its supported-action count is known. Progress counts3 completed initial reads
plus each validated action definition; it does not simulate per-key byte progress.
No additional device calls or firmware changes. Timeout/error hides progress,
late replies are ignored and Retry starts over.

Isolated hardware-free browser QA passes: locked/read-only state, initial unknown
progress, action count advancing1→2, timeout replacing progress with Retry, late
response ignored and successful retry into live layout. Screenshot:
build/reports/power/mapping-progress.png (simulated fixture). Both production
base builds and26-link website checks pass; source/history/archive/site audits
pass for196 curated files. Six existing web tests pass; simulated browser logs
have no errors. Updated packaged production review UI is at localhost8766;
owner’s8785 session/frozen snapshot and installed firmware are untouched.

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
