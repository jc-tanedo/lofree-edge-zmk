# Development

All firmware, website, tools and instructions are experimental and used entirely at your own risk. [Risk notice](../RISK.md).

## Bootstrap

Use Python 3.12+, Node 22, Git, Ninja, CMake, dtc, protoc and LLVM/LLD. The release toolchain is pinned in toolchain.lock.json; local alternative compiler versions are recorded in provenance and are not the same release candidate.

```sh
python3 tools/bootstrap.py
sh tools/build_edge_zmk.sh --ble-studio
sh tools/build_edge_studio_ui.sh
.venv/bin/python tools/package_release.py --site-base ''
```

Bootstrap verifies detached public Git revisions and installs locked Python/npm dependencies. --cache accepts an optional local directory of Git repositories as a network accelerator; it is not a private build input. No vendor installer or stock image is required.

Run `node --test web/tests/*.test.js`, `PYTHONPATH=src .venv/bin/python -m unittest discover -s tests`, and `.venv/bin/python tools/audit_publication.py`. With the BLE build present, run `EDGE_TEST_BUILD=lofree_edge-ble-studio .venv/bin/python tools/test_edge_ble_delayed_dma.py` and the boot/import emulator tests.

Emulator retained slots use this project's own firmware as a synthetic fixture. They test compiled behavior and flag transitions, **not** real vendor-image recovery. Actual stock recovery remains a separate hardware observation, not a guarantee.

## Website

EDGE_SITE_BASE is empty for localhost and /lofree-edge-zmk for GitHub Pages. Build Studio and package the site with the same value. Serve build/site's parent for subpath QA or serve the localhost build/site directory directly. Never expose repository/private directories.

The isolated `tools/build_edge_studio_preview.py` fixture cannot access hardware and is excluded from published packages. Use it for locked, read-failure, delayed-response and editing QA. Do not reload a user's active installer/editor.

## Source and licenses

Source lives here; .deps, build, firmware/build and generated Studio/catalog files are ignored. Board source transformations are hash-pinned. Preserve upstream licenses and update ATTRIBUTION.md when adding tools or libraries. Packaging creates dependency notices and a corresponding-source archive.

## Supported compiler

Release builds use the checksum-pinned official LLVM 23.1.4 distribution. LLVM 18.1.8 compiled and passed image conversion checks but the compiled emulator entered the fatal handler on add-layer; it is not supported for this release. Do not bypass the compiled Studio/BLE tests or assume a successful compiler exit proves a working image.

Packaging reads compiler/version/hash provenance recorded at build time. It refuses a mismatched compiler or stale image metadata. Root browser modules are version-named in packages so an update cannot mix native ESM files from different releases.

Studio read-progress QA: use “Pause mapping reads” for the initial unknown-total
phase, then “Pause action reads” and “Read next action” to observe completed
responses advancing the determinate bar. The15s timeout must replace both bar
and skeleton with Retry; released late replies must not revive the old read.
These controls exist only in studio-qa and cannot access hardware.

## Frontend architecture

Both workspaces use the same pinned React/Vite toolchain from Studio's locked
dependencies. Firmware uses JSX in `web/firmware/`; Studio uses TypeScript/TSX
in the pinned upstream staging tree plus `web/studio-extension/`.

Firmware components own the installer, stock key editor, tabs and dialogs.
`workspace.js` exposes a subscribable device controller with no DOM rendering;
React reads it through `useSyncExternalStore`. Stock maps are read from the
keyboard on connection; only pending drafts live in page memory. Protocol,
image validation and OTA packet modules remain in `web/dist/` unchanged.

The shared banner/navigation remain framework-neutral Web Components in
`edge-shell.js`, with shared typography/tokens in `edge-design.css`; standalone
risk/roadmap pages use them too. React does not introduce a second design system.

`tools/build_edge_firmware_ui.py --base ''` builds Firmware only. Packaging calls
it automatically with the requested site base. Its generated `web/dist/index.html`
and `web/dist/firmware-ui/` are ignored; corresponding source is `web/firmware/`.
Build Studio with the same base before packaging. The old imperative page and
firmware controllers are removed.

`tools/build_edge_firmware_ui.py --preview --base ''` creates synthetic-only
`firmware-qa`. `tools/build_web_preview.py --site build/site --base /lofree-edge-zmk`
stages both mock workspaces under `build/qa-site/lofree-edge-zmk/`. Serve only
that public QA root. QA bundles are excluded from release output by both the
packager and publication audit. Browser checks must not use a real device.

## Studio security extension

See [security.md](security.md) for policy, additive RPC fields and schema.
`stage_edge_security.py` hash-checks and derives the upstream core hook without
editing dependencies. `test_edge_security_emulator.py` uses compiled firmware
and synthetic flash only. Security warnings inspect the live current keymap
across all layers, including unsaved changes; they are not browser-cached maps.

`test_edge_security_boot_emulator.py` is a fast regression at the settings-commit
call site. It injects only the decoded disabled-policy value before settings
load; the full security emulator separately reads actual synthetic flash records.
The short regression must keep at least128B observed margin in every stack.

## Actions disk cleanup

CI, draft releases and Pages target registered `self-hosted`, `Linux`, `X64`
runners. See the [runner Dockerfile and rebuild guide](../tools/runner/README.md).
Provision Ubuntu24.04 with apt access as root or passwordless sudo;
`ci_prerequisites.sh` installs required system packages, while setup actions pin
Python/Node and the compiler lock pins LLVM. Runners must have enough disk for
the full compiler and build. Only run trusted repository changes on these runners.

All three workflows run cleanup with `always()` after their final step.
Self-hosted prepare/finish remove only known transient paths within the matching
checked-out repository workspace. Release/site artifacts and reports are retained.
System SDK removal is restricted to GitHub-hosted runners. Local invocations and
mismatched workspaces are rejected/skipped. Use `prepare|finish --dry-run` with
explicit Actions environment variables to inspect targets without deleting them.
No published releases/artifacts are deleted.

## Connected-wake idle stack

The full BLE delayed-DMA/sleep regression reached264B of idle-stack use through
`arch_cpu_idle` rescheduling, `slice_reset`, `z_add_timeout`, and
`sys_clock_set_timeout` integer division. A384B stack left116B after its4B
sentinel, failing the unchanged128B minimum. This was reproduced in the complete
suite and a narrowed encrypted reconnect/connected-wake probe; an unconnected
forced-suspend probe did not reach the same scheduler path.

The combined build now reserves448B for idle. No other stack is reduced and the
minimum guard is unchanged. Recheck linker RAM usage and all native stack tests
on each new binary; the margin is observed coverage, not proof of every path.
Use the full CI BLE test to reproduce independently of ignored diagnostic fixtures:

```sh
TC32EMU_SUSPEND_RF=lost EDGE_TEST_BUILD=lofree_edge-ble-studio \
  EDGE_TEST_POWER_SLEEP=1 .venv/bin/python tools/test_edge_ble_delayed_dma.py
```

## Unlock save guard

`web/dist/unlock-guard.js` checks the authoritative map/policy at persistence.
Header disabled state comes from the live workspace; the save handler independently
rechecks the device. Imports validate target and final live map. Security blocks
enabling without a direct unlock binding. This is a client guard, not firmware
enforcement. `web/tests/unlock-guard.test.js` covers enabled/disabled/unknown policy,
restoration, live readback and import preflight. The isolated preview includes a
“Load QA import without unlock” fixture; it cannot access hardware.

## Browser-only keymap drafts

`KeymapDraft` owns an in-memory draft and undo/redo snapshots for the current page;
there is no mapping cache in browser storage. `EdgeKeyboard` replaces upstream
live-write editing. Assignment, layer add/remove/reorder/rename, import staging,
Undo and Redo issue no writes. The header counts changed assignments and layer
changes against the fresh device baseline. Page exit discards local drafts.
Discard reads the current device and resets the draft without a write. Power and
Security keep their own explicit Save controls; confirmed Save defaults is an
explicit destructive save. Legacy unsaved RAM edits from another client are shown
as unsaved device changes, separately from the browser draft count.

Save rereads the device, compares it with the baseline, validates layer references
and the unlock guard, applies the target, saves, and verifies readback. New layer
IDs are mapped to allocated device IDs, including behavior references. Firmware
has no atomic bulk-keymap transaction: a failed Save can leave partial active
changes or uncertain persistence. The UI retains the draft, reports uncertainty,
and requires a fresh device read before retrying. No automatic overwrite occurs
when another client has changed the map.

The pinned serial adapter failed a real-RPC-pipeline regression by closing an
already-closed WritableStream before port.close. `edge-serial.ts` owns/relinquishes
port locks and closes exactly once on pipeline completion, abort, or pagehide.
Fresh connections start locked. The adapted MIT emitter hook subscribes once per
topic with a current callback, avoiding lost read-state notifications during draft
rerenders. Tests cover both lifecycle and native draft application.

## Serial reconnect input synchronization

CDC close/open can retain a previous response in firmware TX. A compiled-image
probe reproduced this on3fde7a03. Starting the pinned RPC client directly over old
bytes fails its request-ID check (partial old frames can also fail decoding).
The owned serial adapter consumes old input before creating the RPC pipeline:
150ms with no bytes, with a1500ms continuous-input limit. A pending raw read is
carried into the live stream instead of cancelling the port. Continuous input or
disconnection fails connection explicitly. This adds at least150ms to USB open;
it is not a guarantee against every device/host failure.

`sh tools/test_edge_studio_client.sh` covers real-client info/keymap reads with
clean input, a stale response, and a delayed partial frame, plus stream cleanup.
These tests use synthetic serial ports. The owner's navigation/reconnect test is
still required; read timeouts now identify mapping/layout/action-list/action-detail
phase without including key values or device identifiers.

For a later-stage read stall, `edge-usb-diagnostics.ts` reports session-only
protocol metadata in the timeout error. The missing-response real-client fixture
checks request/response distinction. No diagnostic history is persisted, and
summaries contain no request parameters, response values, names or hardware IDs.
The owner's0/13 action-detail timeout on8796 remains unresolved pending this
wire-level metadata; the stale-input regression must not be called its resolution.

## Studio response framing under backpressure

`stage_edge_rpc.py` derives a reviewed change from the checksum-pinned Studio
RPC source. Both raw framing markers must be inserted successfully: ignoring a
full TX ring can lose EOF after a successful encode, leaving the host awaiting a
complete response. Markers now notify/drain and retry for at most50ms; permanent
blockage returns an error. The existing payload timeout is unchanged.

`python3 tools/test_edge_rpc_framing.py --upstream` reproduces the missing-EOF bug
in the actual upstream response functions with a host transport seam. Without
that flag it tests the staged source across128-byte ring boundaries and permanent
blockage. The payload encoder/transport are controlled fixtures; this is not a
hardware test or proof of the reported intermittent action-detail stall.
`EDGE_BUILD_DIR` permits an isolated firmware build without replacing a frozen
candidate; keep that path inside the workspace. New binaries require native and
exact-SHA hardware validation before distribution or installation.

`test_edge_rpc_framing_emulator.py` checks a one-shot failed EOF insertion at the
compiled ring_buf_put call site, then requires a complete action-detail reply.
It uses synthetic flash/USB and fault injection, not host timing evidence. CI runs
this check inside its existing Security emulator pass via EDGE_TEST_RPC_FRAMING=1,
avoiding another full firmware boot/test pass.

After the owner's bdb42bcd read-stress failure, diagnostic summaries also show
received bytes since the latest request and the unescaped byte count in an open
incoming frame. This distinguishes no input from an unfinished frame; it does not
by itself establish a firmware timing cause or attribute a frame to a request.
`web/tests/usb-diagnostics.ts` covers absent, partial and complete input without
including response values in summaries. The frozen trial installer is unchanged;
frontend-only instrumentation uses a separate preview, with no reflash needed.

For a zero-input timeout, `filter_edge_studio_usbmon.py` filters Linux usbmon text
on the actual host. It selects only this board's CDC bulk endpoints and emits
OUT submission/completion and IN completion metadata, plus RPC sequence/subsystem
from fully captured outgoing frames. It discards HID and other devices before
payload parsing; no response values or hardware addresses are saved. Truncated
usbmon payloads are identified instead of decoded. Outputs must be outside the
public repository and are created exclusively with0600 permissions. Tests cover
scope, parameter suppression, partial capture and failed transfer status. Host
transfer success does not prove firmware parsing; correlate it with browser
counters before proposing another firmware change.

The usbmon filter must retain events with omitted-data tags (notably `<` for an
IN submission and `>` for an OUT completion). Only `=` carries captured hex.
The initial helper omitted these events, so capture1 cannot establish OUT success.
Regression tests preserve both variants. Reference: Linux [usbmon text API](https://docs.kernel.org/usb/usbmon.html).
Never interpret missing filtered records as missing kernel events without checking
format coverage; retain original captures and use a new filename for each run.

## Read-only physical Studio probe

`probe_edge_studio_reads.py` is Linux-only and must be used after browser Studio
releases the serial port. It configures the communications line/DTR, takes an
exclusive open, restores terminal attributes on exit and sends only a fixed
read-only protobuf whitelist. Logs omit maps, names and parameter values. Modes
preserve exact encoded bytes while comparing SDK-style fragments and a single
frame write. A bounded optional follow-up sends only device-info after a timeout;
it reports failure regardless of follow-up success. It is not a keymap editor or
flasher. Normal typing uses a different interface and can continue.

## Diagnostic-only firmware counters

`EDGE_STUDIO_IO_DIAGNOSTIC=1 sh tools/build_edge_zmk.sh --ble-studio` enables a
separate image with CONFIG_LOFREE_EDGE_STUDIO_IO_DIAGNOSTICS. HID GET_FEATURE9
returns67 bytes: report9, schema1/reserved0, then16 little-endian uint32 fields.
Fields0..11 are RX callbacks/bytes/drops, decode successes/failures/last request
sequence, response begins/last response sequence, successful/failed send calls,
and UART TX bytes/zero writes. Fields12..15 are RX/TX ring occupancy, framing enum
and transport-present flag. These are protocol sequence numbers, never hardware
IDs. `read_edge_studio_io_diag.py` issues GET only. There is no reset/write path.
Counters have individual32-bit writers; a read is not an atomic multi-field
snapshot. Sample while traffic is stopped, before Retry/follow-up can overwrite
last-request fields. Instrumentation can affect timing; no reproduction under
instrumentation would not establish a fix. The existing scratch buffer is reused;
48B static counter storage is diagnostic-only. New-image stack and hardware gates
remain mandatory. Opt-out image must remain byte-identical to the tested base.

### I/O schema2: byte integrity and decode error

Schema2 replaces fields0/2 with FNV-1a32 of all UART-received and RPC-consumed
framed bytes, seeded2166136261. Field11 packs the last decode error category in
bits0..7 and framing state before reset in bits8..15. No new RAM is allocated.
The host reader supports both schemas and prints static error names. Source
`edge_studio_io_diag.c` defines the category order. `--initial-fnv` seeds the
read-only probe's expected cumulative fingerprint; compare a successful control
run first, then capture before/failure/after without any follow-up RPC. Expected,
UART and consumed fingerprints distinguish integrity from decode handling.

Fingerprints are not anonymization: keep logs private and do not edit mappings
or use other Studio clients during this diagnostic. HID typing is not part of
the hashed stream. Native tests compare a known encoded request end-to-end and
inject malformed bytes ONLY in the emulator to verify the error classification.
This remains instrumentation, not a fix for the intermittent physical rejection.

### Complete-frame decoder experiment (unvalidated on hardware)

The physical schema2 probe accounted for all sent bytes with matching UART and
RPC-consumed fingerprints, yet nanopb rejected a complete request as `zero tag`.
Host callback extraction and compiled synthetic stress did not reproduce it.
The experimental receiver in `stage_edge_rpc.py` drains one complete frame into
128 bytes of RPC-thread stack before invoking nanopb's buffer decoder. A build
assertion bounds the generated request maximum; oversized frames are rejected
only after draining through EOF. Unescaped SOF restarts collection; escaped marker
bytes remain data. It adds no static frame buffer. New exact-image stack checks
are required because stack consumption changes.

`tools/test_edge_rpc_receive_emulator.py` exercises compiled USB recovery after
invalid, oversized, escaped-marker, empty and interrupted input, followed by a
valid RPC. These cases are synthetic and are never sent by the physical probe.
They validate frame boundaries, not the intermittent physical decoder defect.
Until repeated physical read probes pass, this remains a hypothesis experiment
and must not be promoted as a reliability fix.

Physical trial047100b6: first50 complete coalesced map/layout/action cycles
(802 requests) and500 coalesced action-list cycles (502 requests) pass with
zero decode failures and matching sent/UART/consumed fingerprints. These
results support the complete-frame approach on one Edge/CachyOS host; they
do not establish a precise compiler/callback root cause or release readiness.
Fragmented delivery and browser navigation remain separate checks.

The same trial also passes30 fragmented full cycles (482 requests). Total1786
requests, no timeouts/decode failures, buffers empty and fingerprints match at
every snapshot. Port closed; no settings writes, acceptance or restarts.

Owner browser checks on the same047100b6 image also pass: initial settings load,
five Firmware→Studio full reads without Retry, and two four-key unsaved-draft
leave/reconnect sequences. Counts, no pre-Save typing changes, discarded drafts
and saved-map readback behave as intended. Diagnostics-disabled firmware is a
different image and requires its own validation; this diagnostic is unaccepted.

Diagnostics-disabled candidate5b53224452589907eeafd485b294800023bbf5114746f1feebb9230e8cc8ff5b
passes its own1786/1786 physical read-only requests (50 complete coalesced cycles,
500 action-list cycles and30 complete fragmented cycles), without timeouts.
It exposes no diagnostic fingerprints, so this result establishes reply/read
behavior only. Browser/recovery/power validation remains separate.

Owner normal-image browser checks also pass: initial settings load, five full
Firmware→Studio reads without Retry, and two unsaved-four-key-draft leave/reconnect
sequences. The tested read/navigation symptom is resolved in this observed
workload; precise streaming decoder cause and wider hardware coverage remain
unproven. Recovery, acceptance and power/mode gates are separate.

## Unified firmware installation

`firmware-acceptance.js` owns bounded ZMK reconnect, health/self-test/confirm and
independent acceptance readback. Commands are VERSION(ff00), FLASH_TEST(ff07),
CONFIRM(ff03), VERSION; no overwrite unlock or reboot commands. Writes are never
retried automatically. A timeout, refused test, identity mismatch or missing
retained image prevents completion. A lost confirmation can be resumed: readback
of an already accepted image avoids repeating the flash self-test.

Feature10 is a read-only16-byte identity: report ID10, `EI`, schema1, LE32 image
size, stored trailer CRC32 and running slot. It uses fixed bounded reads after
running-slot consistency checks, not a whole-flash scan in the USB callback.
It reuses the existing feature scratch buffer. Identity is not cryptographic
attestation or a fresh integrity scan. Downloaded images are SHA256-checked;
OTA/boot checks and the retained-image/self-test checks remain separate gates.

Packaging defaults to `installation.mode=trial`. Only exact SHA/version entries
with identityReport1 in `firmware/validated-builds.json` receive automatic policy.
That registry is deliberately empty until new images pass hardware review.
Never approve a diagnostic or infer approval from a successful upload. Changing
this registry changes website/source artifacts; rebuild and compare firmware
bytes before applying existing exact-SHA evidence.

The browser may require permission for the newly enumerated ZMK HID interface.
Automatic discovery uses granted devices only and rejects ambiguity. Continue
installation opens a user-initiated chooser and performs verification without
uploading again. Session metadata stores image identifiers/progress, never risk
consent or mappings. Reload does not trigger acceptance: resumption requires a
fresh confirmation and a matching approved catalog entry. Development trial
installs never call the acceptance path. Simulated preview cannot access USB.

For an approved image already uploaded through another session, the collapsed
“Already uploaded this build?” section can finish verification without an upload
receipt. It still requires a freshly verified catalog image, explicit risk
confirmation and user-selected ZMK interface. Actual image identity and health
are checked before any write. An unapproved trial cannot use this path. A stored
interrupted receipt always selects its original catalog image, never another
currently selected image. Local controlled hardware-test catalogs are distinct
from public approval; the public registry remains empty until review.

HID collection regression: the Edge vendor interface's report5 input/output
collection uses Generic Desktop usagePage1, while feature10/7/8 occupy separate
usagePage0xff00 collections. WebHID matching must recognize these across the
same interface; requiring report5 inside the vendor-page collection rejects a
valid picker selection before any writes. The descriptor-derived test reproduced
the owner's exact selection error, then passed after separating these checks.
Cancelled selection now has its own message.
