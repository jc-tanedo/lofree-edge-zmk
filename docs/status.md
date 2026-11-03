# Unified installer final review packages audited

Final review source4f39240 rebuild retains tested identity-firmware SHA
fc46a4706cb92a0c70c5a3fa0cebcfe46c3331b38b18d276a11274141ac3484d.
Review package provenance clean/matches4f39240.250-file source/history/source+
website archive/site audit and30 hosted-link checks pass (auto-install-review
reports). Previous localhost30-link and hosted browser navigation/risk checks
pass. Targeted final installer tests pass, including removed-approval refusal;
all web test files and49 Python tests previously pass. Normal+diagnostic native
identity/no-flash-write/stack/OTA protocol tests use matching compiled bytes.
No new hardware install. Registry empty pending physical exact-image testing;
current accepted5b532244 and frozen8804 remain untouched. No CI push/publication.
Next: finish current power/mode gates, then freeze/test identity-capable firmware
and the actual unified browser path before adding exact SHA approval. Do not
mark new image hardware-tested from synthetic evidence or auto-approve it.

# Unified installer local verification complete; no hardware update

Implementation64ea25f plus explicit removed-approval resume error. All web test
files and49 Python tests pass; final targeted installer tests also pass.
Normal new identity firmware fc46a4706cb92a0c70c5a3fa0cebcfe46c3331b38b18d276a11274141ac3484d
rebuild matches compiled-test bytes. Normal and diagnostic native identity /
no-write/stack/OTA acceptance protocol tests pass on synthetic flash only.
Both website bases build and30-link checks pass;250-file source/history/source+
website archive audits pass on64ea25f. Browser synthetic success/interruption/
fresh-confirmation/no-reflash resume checks pass; final hosted-subpath Firmware→
Studio navigation and risk notices pass. Final controller-only error refinement
requires review-package refresh, below. Frozen8804 and physical accepted5b532244
remain unchanged. No real device commands, GitHub CI push, merge or release.

Registry remains empty: no build receives automatic policy before exact-SHA
hardware review of the new identity firmware and automatic-install path. New
firmware is necessary; user should not flash old8804 expecting this behavior.
Current hardware remains USB/ON on accepted5b532244; its mode/power gates remain
open. UI implementation is ready for review; physical installation test pending.

# Unified Install Firmware implemented; physical gate pending

Owner authorized one user-facing Install Firmware flow, automatic verification/
self-test/acceptance for validated builds, and retained development trial mode.
Implemented React/controller integration with phase status, persistent interrupted
verification metadata, fresh-confirmation Continue installation (no reflash),
independent acceptance readback and no automatic write retries. Failed checks
cannot report completion. Reload never executes acceptance by itself.

Catalog defaults to trial. Exact SHA/version entries in
firmware/validated-builds.json opt into automatic policy; registry deliberately
empty pending hardware review. New readonly feature10 identifies running image
size/storedCRC/slot with bounded reads, no flash writes/new static buffer. It is
not cryptographic attestation or a fresh full-image integrity scan. Host SHA256,
OTA/boot checks, retained integrity and storage self-test are separate checks.
Older firmware lacks feature10 and stays on development trial workflow.

Local JavaScript tests (all10 files) and49 Python tests pass. Normal and optional
I/O-diagnostic firmware builds/image checks pass; compiled identity/no-write/
>=128B observed stack and actual HID version/test/confirm/readback tests pass on
synthetic flash only. BrowserOS Neo synthetic QA verifies risk confirmation,
completion, interrupted verification, fresh-ack resume without upload; no real
keyboard accessed. Both site bases build; final archive audits pending refresh.
Current physical keyboard stays accepted5b532244, USB/ON, owner baseline/full-cycle
persistence passed. Remaining prior mode/power checks and new identity-firmware
hardware/install validation are still open. Frozen8804 untouched. No new flash,
acceptance, GitHub CI push, merge or release. Synthetic QA at8805 cannot use USB.

# Accepted normal candidate full-cycle persistence passes

Owner confirms exact5b532244: OFF/unplug5s/reconnect/ON, prompt USB typing,
Fn/media/Caps/backlight, Studio unlock and saved map/layers/Power/Security all
pass. Remains USB/ON. Accepted/count0 was read back before this cycle; no new
agent hardware query/write performed. Exact-image BT/mode/power/security
functional sequences remain pending. Owner proposes unified Install Firmware
flow with internal self-test/acceptance; discussing UX, not yet authorization
or implementation. Keep automatic health verification and failed-install
handling explicit; diagnostic/trial workflow must remain available for testing.

# Normal complete-frame candidate accepted after explicit owner approval

Owner explicitly authorized self-test/acceptance of exact5b532244. CLI flash test
passes (bond-log sector erase/write/readback); confirm changes count1→0 and sets
confirmed. Separate info readback: accepted/count0,slotB,retained size/CRC valid.
No reboot/mode change. USB/ON, Studio idle. Exact-image mode/power/security/
persistence hardware checks remain pending; no publication/merge/CI push.

Owner asked regular-user acceptance: currently CLI-only, documented in
user-guide.md#accept-a-tested-trial; browser installs trial but has no acceptance
control. Explain tools/edge_ota.py confirm --accept-risk performs both operations.
Do not silently auto-accept or implement unrequested UI changes. Next full power
cycle/USB/settings persistence, then BT/mode and power/security checks.

# Normal candidate reinstalled; acceptance approval pending

Owner confirms reinstall of frozen5b532244 from8804. Read-only info verifies
slotB/fresh trial1/unconfirmed, retained-image size/CRC checks pass. Prior exact
image ON baseline,1786 physical reads, browser reconnect/draft checks and manual
stock return all pass. No acceptance/self-test performed after reinstall.
Ask separate informed approval for flash self-test and acceptance to permit
repeated mode/power/persistence checks; those exact-image hardware gates remain
pending. Keep USB/ON and Studio idle. No automatic acceptance, CI push or release.

# Normal candidate manual stock return verified; same-image reinstall pending

Owner reports Fn+Space restart USB/ON. Read-only USB enumeration verifies stock
05ac:0256 EDGE84@Lofree. Frozen5b53224452589907eeafd485b294800023bbf5114746f1feebb9230e8cc8ff5b
checksum unchanged; localhost8804 manifest available, diagnostics-disabled label.
No device writes or acceptance. Give same-candidate browser reinstall handoff
with fresh risk acknowledgment, USB/ON. After completion verify fresh trial1/
unconfirmed and retained integrity; acceptance remains separate approval.

# Normal complete-frame browser checks pass; manual stock return pending

Owner confirms normal5b532244: initial saved map/Power/Security load, five
Firmware→Studio reconnect/full reads without Retry, and two four-key unsaved
mapping draft/leave/reconnect sequences pass. Counts rise, typing remains saved,
leaving discards drafts, and saved mappings reload. Combined with1786 automatic
read replies, previously failing read/navigation pattern is not reproduced on
this exact normal binary and one Edge/CachyOS host.

Still unconfirmed trial; USB/ON. No acceptance or permanent keymap writes from
these tests. Next disconnect Studio, Fn+Space3s/release for manual stock return;
verify stock USB identity before same frozen8804 candidate reinstall. Acceptance
requires separate approval after trial/retained integrity read. Exact-image
mode/power/security/persistence checks remain pending; no CI push/merge/release.

# Normal complete-frame candidate: physical read stress passes

Owner confirms5b532244 baseline typing/Fn/Caps/backlight, Fn+U and Studio closed.
Read-only Linux probes on exact5b53224452589907eeafd485b294800023bbf5114746f1feebb9230e8cc8ff5b:
50 coalesced full cycles802/802 replies,500 action-list cycles502/502,
30 fragmented full cycles482/482. Total1786/1786 replies, zero timeouts.
Normal build lacks feature9 diagnostic fingerprints, so no decoder-counter claim
is made. Private normal-frame-{full,small,fragment}.jsonl logs record operation,
sequence/timing/counts only. Port closed and termios restored; no settings saves,
acceptance, firmware writes, restart or mode changes. Trial remains unconfirmed.

Next owner browser initial settings load, five Firmware→Studio read reconnects,
and two unsaved-four-key-draft leave/reconnect checks on8804. Keep USB/ON, avoid
restarts. Then manual stock return/reinstall and separate acceptance handoff
before repeated power/mode/persistence testing. No CI push/merge/publication.

# Normal complete-frame candidate installed; baseline pending

Owner installed5b532244 from8804. Read-only info: slotB/trial1/unconfirmed,
retained-image size/CRC checks pass. No acceptance/settings writes. Owner asks
for plain-language explanation: old decoder interpreted streaming arrivals;
new decoder receives a complete bounded frame before protobuf interpretation.
Matching fingerprints previously isolated rejection rather than lost USB bytes;
exact low-level callback/compiler cause remains unproven. Instrumented candidate
passed1786 physical reads and browser reconnects; normal image still needs its
own baseline/read/browser/recovery and subsequent acceptance/power gates.
Keep USB/ON, avoid restart/modes. Ask ON baseline/Fn+U/Studio tabs closed before
read-only normal-image probes; normal build has no feature9 instrumentation.

# Normal complete-frame candidate frozen; stock verified for install

Full local tools/ci.sh exits0 on source0834b8f (no GitHub CI push): Python/web,
compiled Security/request-recovery/USB/BLE/mode/power/storage/stack/boot/import/
draft/switch checks, both website bases and source/history/archive/site audits.
Diagnostics-disabled OTA SHA256:
5b53224452589907eeafd485b294800023bbf5114746f1feebb9230e8cc8ff5b (121940B).
Frozen build/hardware-tests/alpha3-complete-frame-normal-5b532244-0834b8f;
localhost8804/session38397. Source/website archives and246-file audits pass;
30 hosted-subpath asset/link checks pass. BrowserOS Neo verifies servedSHA/size,
selected diagnostics-disabled label, same-tab Studio and both persistent risk
notices/disconnected controls. Source build clean at0834b8f; frozen immutable.

Read-only USB identity still stock05ac:0256 EDGE84@Lofree. Owner already returned
to stock successfully; do NOT ask Fn+Space again. Ready for browser install with
fresh risk acknowledgment, USB/ON, then read trial/retained integrity. No normal
candidate installed or accepted yet. Acceptance remains a separate handoff.
No release/merge/Pages deployment. Normal exact-image hardware checks required.

# Complete-frame diagnostic stock return verified; normal preflight next

Owner confirms Fn+Space3s/release restart, USB/ON. Read-only enumeration verifies
05ac:0256 EDGE84@Lofree. Diagnostic047100b6 manual return passes; it was never
accepted. Hardware is now stock; do not query serial or install during preflight.
Prepare diagnostics-disabled normal candidate with local CI-equivalent gates,
including compiled bounded request recovery added to tools/ci.sh. No GitHub CI
push; owner requested local audits during development. The normal binary needs
its own exact-SHA hardware validation; diagnostic results do not transfer.

# Complete-frame browser reproduction passes; stock return pending

Owner confirms exact047100b6: initial mappings/Power/Security load, five
Firmware→Studio reconnect/full reads without Retry, then two four-key draft/
leave/reconnect sequences pass. Draft counts increase, drafts do not affect
physical typing, leaving discards them, saved mappings reload. Combined with
1786 automatic requests, the previously failing read/navigation pattern has not
recurred on this Edge/CachyOS host. Precise callback/compiler cause remains
unproven; results do not certify a different binary.

No acceptance or settings saves requested. Current image is still the
unconfirmed diagnostic, USB/ON. Ask owner to leave Studio idle/disconnected and
Fn+Space3s/release for manual stock return; verify stock identity afterward.
Then prepare the diagnostics-disabled production candidate and its independent
local/exact-SHA gates before installation. Do not accept this diagnostic, merge,
push CI, publish or claim release readiness from these results alone.

# Complete-frame physical read stress passes; browser checks pending

Owner confirms047100b6 baseline typing/Fn/Caps/backlight and Fn+U, Studio closed.
Read-only probes on exact047100b6690d9fbce41dcd171224089934c3c5826ae3d22a650af319c09be280:
- 50 coalesced full map/layout/action cycles:802 requests, zero decode failures,
  expected/UART/RPC fingerprint694883712.
- 500 coalesced action-list cycles:502 requests, zero decode failures,
  fingerprint1490866167.
- 30 fragmented full cycles:482 requests, zero decode failures,
  fingerprint1163474970.
All1786 requests complete; no timeout/send failure; RX/TX rings empty at each
snapshot. Private logs frame-{full,small,fragment}*.json/jsonl under
private/analysis/logs/studio. No follow-up requests before after snapshots.
Serial port closed/termios restored. No save/flash/acceptance/restart/mode change.
Trial remains unconfirmed; keep USB/ON. Browser initial/navigation/draft-leave
reconnect checks now needed. Results support complete-frame decoding on one
physical device but do not establish exact callback/compiler root cause or
release readiness. No acceptance planned for this short experiment.

# Complete-frame experiment installed; awaiting baseline/unlock

Owner installed frozen047100b6 from8803. Read-only info: slotB/trial1,
unconfirmed, retained-image size/CRC checks pass. Feature9 schema2 available,
zero ingress/decode/egress counters, FNV seeds2166136261, transport present1.
No acceptance/settings writes. Ask owner ON typing/Fn/Caps/backlight baseline,
Fn+U once, all Studio tabs closed. Then before/after schema2 snapshots around
controlled read-only coalesced/full-read stress. Keep USB/ON; no restart/modes.

# Complete-frame experiment: stock verified; awaiting owner install

Owner confirmed Fn+Space return. Read-only USB identity05ac:0256
EDGE84@Lofree verified. Frozen OTA047100b6690d9fbce41dcd171224089934c3c5826ae3d22a650af319c09be280
unchanged; localhost8803 manifest reachable and selects complete-frame candidate.
No device writes/acceptance. Provide browser installation handoff with fresh risk
acknowledgment, USB/ON unchanged. After completion read trial/retained integrity
and feature9 availability before owner baseline/unlock. No acceptance planned.
Do not query keyboard while owner flashes.

# Complete-frame candidate frozen; ready for stock-return handoff

Source7e700c5 rebuild reproduces OTA047100b6690d9fbce41dcd171224089934c3c5826ae3d22a650af319c09be280.
Frozen build/hardware-tests/alpha3-frame-buffer-047100b6-7e700c5 with source,
pinned dependencies, ELF/OTA, website, notices, provenance and checksums.
246-file source/history/source+website archive/site audits and30-link subpath
checks pass. BrowserOS Neo verifies served SHA/size, selected complete-frame
build, same-tab Studio navigation, disconnected controls and both risk notices.
Installer localhost8803/session41332 serves this snapshot only. No CI push.

Hardware remains unconfirmed07a90b83, USB/ON, Studio closed. No writes/acceptance
or restarts performed. Ask owner to save/export if needed and Fn+Space3s/release
back to stock. Verify stock USB identity before installation instructions. Fresh
risk acknowledgment required. No acceptance planned for this short experiment.
After install verify trial/retained report; owner baseline/Fn+U/Studio closed;
then run controlled read-only full/coalesced probes with before/after schema2
fingerprints. Physical read reliability remains unresolved until these tests pass.

# Complete-frame experiment: local gates pass; hardware validation pending

Instrumented experimental OTA SHA256:
047100b6690d9fbce41dcd171224089934c3c5826ae3d22a650af319c09be280.
Pinned build/instruction/data/CRC checks pass. Compiled feature9 byte correlation,
read-only behavior, map persistence and >=128B observed stack margin pass.
Malformed/oversize/escaped/empty/interrupted frame recovery followed by valid RPC
passes; the previous experimental binary failed the interrupted-frame test.
Security policy/storage/fault/reboot and failed-EOF response regression pass with
>=128B observed stack margin. Compiled change-only SET_IDLE passes. 48 Python
tests and246-file source/history audit pass; diff whitespace check passes.
Logs: build/reports/frame-diagnostic-{build,test,receive,security,usb}.log.

This is not a proven fix for the physical intermittent zero-tag rejection.
No frozen installer/source archive or website audit yet; no CI push or release.
Physical keyboard remains unconfirmed07a90b83, USB/ON, serial port closed;
no settings writes, acceptance, restart or mode changes during this work.
Next: review/freeze exact source and artifacts, audit archives/site, then owner
stock-return/install handoff for repeated physical coalesced/full-read probes.
Do not accept the current diagnostic or flash this experiment without handoff.

# Complete-frame decoder experiment under local validation

Physical schema2 comparison: 200 action-list reads pass with 10ms-separated
frame markers; coalesced action-list delivery fails at request108 with matching
expected/UART/consumed FNV2363284455, zero tag at EOF, and no TX failure.
No settings writes or acceptance. Installed07a90b83 remains trial1, USB/ON.

An experimental bounded128-byte stack frame replaces the unknown-length nanopb
callback stream. The generated request maximum is compile-time checked against
the bound. Oversize frames drain through EOF; a new unescaped SOF resynchronizes.
This tests a hypothesis, not an established fix. Neither the host extraction nor
compiled emulator reproduces the original physical failure; hardware is the
red-capable validation seam. A synthetic compiled recovery test was added for
malformed/oversize/escaped/empty/interrupted frames followed by a valid request.

The first experiment built and passed Security/stack checks. A subsequent source
transformation guard rejected the SOF-resync revision; tests inadvertently ran the
previous binary. Those results do not validate the new revision. Guard corrected;
current instrumented rebuild and tests are chained on successful build. No new
candidate frozen, installed, accepted, pushed to CI or promoted.

# Physical integrity match; decoder rejects request as zero tag

Owner confirmed schema2 baseline/Fn+U/Studio closed, USB/ON. Controlled info/lock/
info probe passed: expected FNV2197083596 equals UART and RPC-consumed streams.
Then read-only full probe failed request10 (behavior details), zero response bytes.
Before/after: RX+109 matches total sent; decode_ok+10/decode_failed+1; last decoded/
replied9; send_failed0; rings empty. Expected FNV30679303 equals both firmware
fingerprints. Error category3 zero tag; pre-reset framing4 EOF. Fingerprints are
noncryptographic evidence, not proof against collision; no payloads logged.
Private logs integrity-control* and integrity-failure* in private/analysis/logs/studio.
No follow-up RPC before after snapshot; no save/flash/acceptance; port closed.

Ranked hypotheses: callback/ring boundary behavior, nanopb nested callback stream,
or request encoding mismatch. Host extraction of actual upstream callback/framing
and pinned nanopb/generated descriptors passes19500 action-detail decodes across
39 ring splits; simple wrap alone not reproduced. Throwaway harness in ignored
build/tmp/check_rx_callback.py, compiled firmware stress passes 500 additional synthetic reads in
build/reports/integrity-native-stress.log. Hardware stays unconfirmed07a90b83,
USB/ON. No restart/mode changes or acceptance authorized. Need native stress
result and targeted decoder/compiled-code analysis; do not claim fixed.

# Integrity diagnostic installed; awaiting baseline and unlock

Owner installed frozen07a90b83 from8802. Read-only status: slotB/trial1,
unconfirmed; retained image size/CRC checks pass. Feature9 schema2 available:
zero RX/decode counters, both FNV seeds2166136261, transport present1.
No acceptance/settings writes. Ask baseline and Fn+U once, Studio tabs closed,
USB/ON unchanged. Then controlled read-only fingerprint comparison; no follow-up
RPC before after-counter snapshot on failure.

# Integrity diagnostic: stock verified; awaiting owner install

Owner returned to stock; read-only USB identity05ac:0256 EDGE84@Lofree verified.
Frozen07a90b83 image checksum unchanged and localhost8802 catalog reachable.
Give installation steps; do not query hardware during flashing. After completion,
read trial/retained integrity and schema2 feature report before requesting baseline
and physical unlock. No acceptance planned; diagnostic does not claim a fix.

# Schema2 diagnostic frozen; ready for stock return

Source9a840c0 clean rebuild reproduces07a90b8374ffad79c3ca65e66af05191497afdeb09885e4f2ceefe8073499d34.
Frozen build/hardware-tests/alpha3-studio-io-v2-07a90b83-9a840c0;
localhost8802/session33206. 245-file source/history/source+website archive/site
audits pass. Browser verifies served SHA, selected diagnostic, persistent risk
notices on both pages and same-tab Studio navigation. Native checks/48Python
and diagnostics-disabled byte identity already pass. No CI push or release.

Physical hardware still unconfirmed schema1 d2954ee5, USB/ON; no acceptance.
Ask owner Fn+Space3s/release stock return; verify stock identity before install.
Schema2 is instrumentation, not a fix. After install/unlock/Studio closed, run a
short successful fingerprint control, then before/after snapshots around the
first failed read-only probe seeded with initial FNV. No follow-up before snapshot.
Compare expected bytes versus UART/RPC fingerprints and decoder error category.

# Schema2 diagnostic local gates passed; not installed

Exact diagnostic SHA256 07a90b8374ffad79c3ca65e66af05191497afdeb09885e4f2ceefe8073499d34.
Pinned build/image/CRC, native checksum/error classification, mapping persistence,
Security/fault/reboot and startup stack gates pass (observed margins >=128B).
48 Python tests and source/history audit pass. Final diagnostics-disabled build
remains byte-identical to bdb42bcd. Freeze/archive/site/browser checks remain before
hardware handoff. No CI push. Physical keyboard remains unconfirmed schema1 d2954ee5,
USB/ON, Studio closed; no acceptance or additional flash performed.

# Diagnostic proves decode failure; integrity/error schema2 under local test

Physical d2954ee5 probe1:21 requests/216 encoded bytes; UART RX increased216 with
zero RX drops, decode_ok+20/decode_failed+1, last decoded/replied#19, failed#20
(action list), no TX failure, both rings empty. Small-only test also fails without
large responses: request147 lost,1202/1202 sent bytes accounted, one decode failure.
No retry/follow-up preceded the after-counter snapshots. This isolates rejection
before dispatch, but byte counts do not establish byte integrity.

Schema2 reuses diagnostic fields0/2/11 (no additional RAM): UART-stream and
RPC-consumed-stream FNV32 fingerprints plus decoder error category/framing state
before reset. Counters otherwise retain offsets. No raw payloads, typed keys,
mappings or addresses are stored. Use only controlled read-only probes; checksums
are fingerprints, not anonymization. Python probe logs an expected cumulative
fingerprint when seeded from the before snapshot. Schema1 remains readable by the
host tool. Diagnostic2 builds/image-checks. Native test caught that release configuration
disables nanopb error strings; enabled them only for this diagnostic (normal
image remains unchanged), and rerunning checksum/error, Security and startup
stack gates. No hardware update has occurred. No new firmware installed; current hardware stays unconfirmed
d2954ee5, USB/ON, Studio closed. No acceptance or CI push.

# Counter diagnostic installed; awaiting unlock/baseline

Owner confirmed install from8801. Read-only info reports trial1/unconfirmed/slotB
and valid retained size/CRC. Feature9 returns schema1, zero initial counters and
transport-present1. No writes or acceptance performed. Ask owner for ON typing/
Fn/Caps/backlight baseline and Fn+U once, keeping Studio tabs closed, USB/ON.
Then get a feature9 baseline, run automatic read-only probe without follow-up,
and get feature9 immediately after the first failure before any Retry/new RPC.
Installed trial is d2954ee5; frozen artifact unchanged. No CI push/release/merge.

# Counter diagnostic: stock verified; awaiting install

Owner confirmed manual return from failed bdb42bcd to stock. Read-only USB identity
05ac:0256 EDGE84@Lofree verified; frozen d2954ee5 image checksum unchanged. Give the
8801 browser install steps only after server availability check. Do not query the
keyboard while the owner installs. Then read trial info and feature9 counters.
No counter diagnostic installed or accepted yet; old framing trial was not accepted.

# Studio I/O diagnostic frozen and locally cleared for handoff

Source5a7ceca rebuilt clean with identical diagnostic bytes d2954ee59fcfa16d94e458c8d6e4db40c80657a7fc11bf6bb06ea844e5fd3e39.
Frozen site/artifacts/checklist: build/hardware-tests/alpha3-studio-io-d2954ee5-5a7ceca.
Local pinned image/instruction/CRC, feature9 correlation/read-only, map Save/reset,
Security/storage/fault/reboot and startup stack tests pass; observed margin>=128B.
47 Python tests and245-file source/history/source+website archive/site audits pass.
BrowserOS Neo verifies catalog, served SHA, both risk notices and same-tab Studio.
Server8801/session12098 serves the immutable trial snapshot. No CI push per owner
local-development preference; this is a diagnostic trial, not a release or fix.

Owner may now return to stock (keepUSB/ON; Fn+Space3s/release), then verify stock
identity before installation steps. Current keyboard remains unconfirmed bdb42bcd,
boot1; all automated probes were read-only. Do not accept the failed framing trial.
After diagnostic install: verify trial info, obtain physical unlock once if needed,
close Studio, sample feature9, run probe until a failure without follow-up, sample
feature9 before any Retry. No acceptance planned during this short USB diagnostic.

# Automated physical read reproduction; diagnostic counter build under test

Corrected capture2 shows request#8 sent as1+11 bytes, both OUT completions status0,
then no IN completion. Host-level completion does not prove firmware parsing.
Owner disconnected Studio/all tabs and authorized automated read-only serial tests.
New Linux probe reproduces zero-byte loss without the browser: fragmented run
failed in cycle2/request30; whole-frame run failed in cycle3/request40. A further
whole-frame run reached cycle20 then lost layout request307. On the SAME connection,
read-only device-info request308 replied in9.35ms, proving no permanent connection
hang. No configuration, flash or acceptance commands were sent. Read-only status
still reports slotB/trial1/unconfirmed and valid retained image after the probes.
Private JSONL logs contain operation/sequence/timing/byte counts only.

Offline strict-IN-toggle assertions passed20 metadata cycles; this does not
reproduce the physical failure. Request fragmentation alone is not the fix.
Preparing optional CONFIG_LOFREE_EDGE_STUDIO_IO_DIAGNOSTICS:12 protocol counters
and4 live ring/framing flags through read-only HID feature9. No payloads/keys,
selector writes, arbitrary memory access, counter reset or flash operations.
It reuses the existing67-byte feature scratch buffer. Static RAM22468/22528B
(48B extra); no threads/stacks added. Opt-out rebuild remains byte-identical to
bdb42bcd. Instrumented image passes pinned build/image checks and compiled feature, map/layer
Save/reset persistence, Security/storage/fault/reboot and >=128B observed stack
checks.47 Python tests and245-file source/history audit pass. Not yet frozen or
cleared for installation. Current physical firmware
is unchanged unconfirmed bdb42bcd. Do not accept it or change modes.

# First USB capture: request submission seen; completion filter corrected

Private capture zero-reply-usbmon-1.log has696 metadata lines. Its final request
is#10/behaviors at14.824810s; no IN completion follows. It retains124 OUT submissions
but ZERO OUT completions or IN submissions. The filter incorrectly rejected data
omission tags (`>` completion and `<` submission), documented by the Linux usbmon
text format. Therefore this capture cannot prove successful USB OUT delivery.
Do not infer a firmware receive/parse failure from missing retained records.

Two regressions reproduce the filter omission (0 vs1 returned record). The fixed
filter accepts single-character data tags and parses hex only for `=`. All42 Python
tests pass, including scope/privacy and both omitted-payload forms. Original
capture preserved; a new file is required for the repeat. No firmware changes,
flashes or acceptance. Frozen8798 and diagnostic8799 stay unchanged.

# No response bytes after outstanding request; USB delivery capture pending

Owner reproduced on the sixth read using8799:5/13 details complete, sent#11/write
complete, prior response#10,3526 total bytes, ZERO bytes since the last request,
no unfinished frame,13.2s without progress. This observation does not fit a merely
missing EOF on that request and weakens the partial-payload lead. It does not by
itself prove host delivery to the device. Do not accept or declare the read issue
resolved. Installed unconfirmed bdb42bcd and frozen8798 remain unchanged.

Added tools/filter_edge_studio_usbmon.py to separate CDC OUT submissions/completions
and IN completions during one owner reproduction. It scopes to the connected
1d50:615e device and CDC endpoints5OUT/2IN, drops HID/other-device traffic, emits
only relative timing/status/sizes/session ticket numbers and RPC request sequence/
subsystem, and never writes raw payloads or addresses. Output is exclusive0600
outside this public tree. Three filter regressions plus37 existing Python tests
pass. Administrator access is needed only for the human-run usbmon source; no
keyboard commands or firmware writes are sent by the helper.

# Partial-response diagnostic ready on8799

Frontend-only diagnostic adds bytes received since the latest request and open
frame payload length. Local tests distinguish no reply, partial frame and complete
reply without disclosing response values. All serial lifecycle/reconnect tests,
production TypeScript, both30-target website checks and235-file source/history/site
audits pass. BrowserOS Neo confirms disconnected Studio/risk banner. Preview8799
(session89938) serves build/ui-previews/read-partial; its firmware catalog is copied
from the matching frozen bdb42bcd candidate. No reflash is needed. Frozen8798 and
installed firmware were not changed. Owner must disconnect the old editor before
using8799; capture the first timeout with the new counters before Retry. No CI push
for this development-only instrumentation, per owner preference.

# Framing candidate read-stress failed; do not accept

Owner reports trial bdb42bcd failed reads3 and5 of five navigation/reconnect cycles.
Cycle3 recovered with Retry; cycle5 first retry failed, second succeeded. Latest
error:4/13 details complete; last written getBehaviorDetails#10, last complete
response#9,3485 received bytes;13.2s since progress/15s total. This is not resolved
by the raw-marker fix. Baseline passes were not explicitly confirmed separately.
Keep trial unconfirmed, USB connected and sliderON; no acceptance/power cycle.
Frozen installer stays unchanged. Need distinguish partial response from no bytes
for the outstanding request. The existing payload writer still aborts after50ms
without ring space; a host seam demonstrates400-byte payload abort with128 queued
bytes under persistent backpressure. This is a separate lead, not a hardware cause
established by the reported aggregate byte count. No firmware writes this turn.

# Frozen preview server restored

Owner could not reach8798 before baseline checks. Restarted the same frozen
static server (session65533), rechecked unchanged bdb42bcd OTA checksum and Studio
availability. No source/bundle/image changes, flash or acceptance. Hardware tests
remain pending; keep USB connected and sliderON. Do not reinstall for this outage.

# Framing trial installed; baseline/reconnect testing pending

Owner confirmed installation through frozen8798. Read-only edge_ota info reports
ZMK, slotB, trial boot1, unconfirmed and retained image size/CRC valid. Installed
candidate SHA is frozen bdb42bcd8daaf025f28b57501e5e020188ea175b979e58bd95c6973b116d60de;
no acceptance was requested or performed. Keep USB connected and sliderON until
the next owner-guided tests. Studio baseline and repeated reads/navigation remain
pending; do not infer a physical fix from compiled fault-injection results.

Added requested direct-from-ZMK update investigation issue14 and roadmap entry.
Current supported flash procedure is unchanged. Future work must assess existing
TC32 OTA/boot-guard machinery rather than assume none exists. Frozen installer,
firmware/catalog/source artifacts were not modified. No merge/tag/release/Pages.

# Framing trial: stock verified; awaiting browser installation

Owner confirmed saved-edits/stock-return handoff for frozen bdb42bcd candidate.
Read-only USB identity05ac:0256 EDGE84@Lofree verifies stock; frozen OTA checksum is
unchanged. CI/native hash and audits/browser preflight passed. Installer8798 is
available. Give browser instructions; do not query/write the keyboard while the
owner installs. After explicit completion, read trial/retained info before tests.
No image has been installed or accepted in this phase. Acceptance stays separate.

# Frozen framing candidate ready for hardware handoff

CI41549936377 succeeded on618635d; native-test and packaged OTA SHA matches frozen
bdb42bcd8daaf025f28b57501e5e020188ea175b979e58bd95c6973b116d60de.
All independent preflight gates passed. Frozen installer is on8798; source and
artifacts remain unchanged. Owner may save/export edits and return to stock;
verify stock USB identity read-only before installation instructions. Installation
is an unconfirmed trial; acceptance requires separate authorization. No firmware
was written and no hardware pass is inferred from CI. Installed image remains
accepted3fde7a03. No merge/tag/release/Pages deployment.

Development preference: run applicable tests/audits locally while iterating, and
handoff to CI when opening/updating a PR for review. Avoid redundant development
CI pushes. Local exact-image gates can authorize development trials; release
promotion retains full CI and exact-SHA hardware gates.

# Clean framing candidate frozen; waiting for CI

Frozen source618635d (clean checkout) rebuilt OTA byte-identical to the locally
native-tested provisional image: bdb42bcd8daaf025f28b57501e5e020188ea175b979e58bd95c6973b116d60de,
121940 bytes. Build tree: build/hardware-tests/rpc-framing-source-618635d.
Frozen installer/artifacts/checklist: build/hardware-tests/alpha3-rpc-framing-bdb42bcd-618635d.
Source/history/source+website archive and site audits pass (234 source files);
package provenance and source snapshot are clean. BrowserOS Neo confirms selected
hardware-test catalog, served-image SHA, risk notice on both workspaces and same-tab
Studio navigation, with no keyboard connection by the agent. All package checksums pass.
Server8798/session84517 serves the frozen directory. CI41549936377 is still in
progress; its success and native hash verification are required before stock
return/installation handoff. Do not replace/rebuild frozen bytes during testing.
Owner requested preparing a flash test; nothing was installed or accepted.
Keyboard remains accepted3fde7a03. No release/merge/Pages deployment.

# Action-detail stall: bounded response-marker fix under validation

Owner reproduced the failure before making any edits on8797:7/13 action details,
last sent behaviors.getBehaviorDetails#13/write complete, last complete response#12,
3898 received bytes,12.9s without progress. Retry works. Draft navigation is not
required; increasing the overall15s deadline is not justified by this trace.

An actual-source C transport seam reproduces a firmware framing defect: with the
128-byte TX ring full after a127-byte encoded payload, send_response ignored a
failed EOF insertion, returned success and emitted an incomplete frame. Command
`python3 tools/test_edge_rpc_framing.py --upstream` fails at that boundary. The
hash-pinned Edge staging hook now retries raw SOF/EOF insertion with bounded
backpressure, returns an error after50ms of continuous blockage, and preserves
upstream input. The patched seam passes10 boundary sizes plus blocked-transport
termination. This defect explains a possible missing response; the owner's exact
hardware request#13 has not yet been reproduced offline or shown fixed.

A separate original3fde7a03 native probe passed three complete reconnect/read cycles
with one-byte OUT fragmentation and8ms IN polling. That does not reproduce the
reported stall. The framing candidate builds in a separate directory, passes image/
instruction/OTA checks, and keeps static RAM22420/22528B. Native Studio enumeration, keymap/layer Save/reset persistence and disabled-policy
startup regressions pass. The security/storage/fault/reboot regression passes with >=128B observed stack
margin. The original compiled image times out on an action-detail request when
one EOF insertion is forced to fail; the patched compiled image completes the
same fault-injected response in2ms. The fixture resolves the RPC object’s local
helper rather than a same-named CDC helper after LLVM specialization. Host-boundary,
compiled normal/fault cases,37 Python tests and source/history audit pass. Full CI
and physical stress tests remain pending. Provisional local OTA SHA-256:
bdb42bcd8daaf025f28b57501e5e020188ea175b979e58bd95c6973b116d60de.
This is not a frozen clean-commit candidate or a hardware-tested artifact. No installer/catalog was replaced and nothing was flashed;
accepted3fde7a03 and its build remain unchanged. Current candidate is not approved
for hardware handoff, merge or release; exact-SHA gates remain required.

# Owner reconnect trace — first action detail stalls

Owner retest on8796 still failed: supported actions0/13,13.2s since last progress,
15.0s total; Retry worked. Thus stale-input handling does not resolve the reported
later-stage stall. It is not just an overall deadline expiring during progress.
The exact real-device stall has not been reproduced offline.

A session-only USB diagnostic now reports the last framed request/response method,
request sequence number, elapsed time, write completion, and received byte count
in the existing error. It retains no bindings, keyboard names, typed keys, device
identifiers, or logs in browser storage. Input/output bytes are parsed only for
protocol metadata, with bounded frame buffers. A real-client missing-response
fixture verifies that the report distinguishes the sent behavior-detail request
from the last successful map response. This is instrumentation, not a claimed fix.
Diagnostic preview prepared on8797; owner pages and firmware remain unchanged.
Six serial startup/reconnect/diagnostic cases and three lifecycle cases pass.
Production TypeScript, both30-target website checks and the230-file source/history/
website audit pass. Browser check confirms the disconnected screen and risk notice.

# Reconnect after leaving drafts — stale CDC input regression

Owner confirms8794 draft edits no longer affect typing and Save applies correctly.
However, leaving four unsaved drafts through Firmware and reconnecting still timed
out reading mappings. The earlier stream-cleanup fix did not resolve this report.

An offline probe against accepted compiled3fde7a03 demonstrated old response bytes
remaining across CDC DTR close/open while a large response was in flight. The real
pinned RPC client regression failed with “Mismatch request IDs” on stale input.
The serial adapter now drains pre-session input until150ms quiet, bounded to1500ms,
before creating the RPC client. It preserves the pending reader for new replies;
no mapping or settings write is involved. Clean, stale-frame and delayed partial
frame tests pass, alongside normal/abort/pagehide teardown tests. Timeout messages
now identify the read phase. This is a tested cause of reconnect failures, but the
owner's exact intermittent timeout still requires a hardware/browser retest.
Owner clarified the failure occurs near60% after returning via Studio link, and
Retry recovers. That later-stage symptom is not yet reproduced; do not equate the
stale-input regression with confirmed resolution. The diagnostic timeout also
reports time since last progress to distinguish a stalled request from the
existing15s total read deadline. Separate review is prepared on8796. Five serial
startup/reconnect cases and three cleanup cases pass; production TypeScript and
both website bases pass.
No firmware, accepted boot state, saved mappings or owner pages were changed.

# Draft-only keymap editing and real change count — local validation in progress

Owner requested no keymap writes until Save. Draft assignment, layers, imports,
Undo/Redo and Discard now stay in page memory; Save checks a fresh device baseline,
rejects conflicts, applies/persists and verifies. Counts represent changed key
assignments and layer changes. No localStorage mapping authority. UI guards remain.
The installed accepted3fde7a03 image is unchanged; no new flash is needed.

A compiled-image probe confirmed previous live edits survived reconnect in RAM
with unchanged flash; Discard restored the saved map. Separate serial teardown
regression reproduced a closed-stream exception before port.close; the own adapter
passes normal close/abort/pagehide tests. Stable emitter subscriptions fix a lost
Reading-state update. Draft tests pass, and the JS draft Save pipeline passed
against compiled3fde7a03 for reorder/rename/key changes/layer remove/add/readback.
Synthetic browser checks show zero writes on edit/Undo/Redo/import/Discard and
one save only after explicit Save. Navigation confirms leaving discards the browser draft with zero keymap writes; actual counts and Save/readback pass in the browser. Local validation passes: 73 JavaScript cases, 37 Python tests, three serial lifecycle cases, compiled-image draft integration, both website bases (30 targets each), and the 228-file source/history/site audit. Production preview is available on port8794; owner validation is pending. The numeric counter tracks differences from the initial device map, not edit clicks.
The active owner8792 page and frozen8789 installer have not been replaced.

# UI follow-up during accepted3fde7a03 hardware validation

Owner requested an inset missing-unlock warning and prevention of unsafe saves.
Warning now has responsive20–48px horizontal margins and22px inner padding.
Main Save is disabled when the live map lacks a direct unlock binding and locking
is enabled/unknown. The save handler independently reads the device map/policy;
imports preflight their target and recheck before persistence. Security cannot
stage-confirm enabling without a binding. Undo/Discard remain usable; disabled
protection permits maps without unlock. These are client guards, not firmware
restrictions, and require no new flash.

The installed accepted OTA remains3fde7a03; no firmware source/image change.
Owner passed ON baseline, both security reboot modes, manual stock return/reinstall,
and original warning/Undo. New save guards pass synthetic browser checks (enabled/disabled save,
Undo, guarded enabling and blocked import) on8791; the owner’s8789 editor/frozen installer is untouched. Remaining
hardware checks include the updated guard UX and mode/Power regressions. Final
firmware CI41472762063 passed on1c021ad; frontend follow-up passes64 JavaScript tests,37 Python tests and30 website targets
for each base. Production review is prepared on8792. Live warning bounds show
horizontal gaps and padding; CDP screenshot capture timed out, so no screenshot
claim is made. Source/site audits are run before committing this follow-up.

# Enlarged idle stack — complete local CI passed

The same tools/ci.sh run exited0:37 Python tests, frontend/codec checks, native
security/USB/BLE/mode/Power/deep-entry/boot/import/diagnostic suites, both website
bases (30 targets each), source/history and source+website archive audits passed.
Report: build/reports/idle448-full-ci.log. OTA SHA-256:
3fde7a03218f8886391c54a3476a56a48592b74c7147460f00a61982a0f13722.
Native stack guards stay128B; narrowed connected-wake idle spare180B. Static RAM
22420/22528B. The replacement runner's CI41471171660 on c64d76a is still running.

No hardware handoff yet. Package provenance currently identifies build commit1089aef;
source-only documentation/runner updates followed during validation. Refresh the
build/package from the final clean tree, verify the OTA remains byte-identical,
and await remote CI before freezing the physical-test snapshot. Installed accepted
145f81d2 remains unchanged. Current-draw and exact-image physical gates remain open;
Fn/media cold wake remains tracked. No merge/tag/release/Pages deployment.

# Replacement runners executing CI

Owner rebuilt/recreated the runners; API verified three online Linux/X64 runners.
CI41471171660 on c64d76a passed system prerequisites, scoped cleanup and pinned
Python setup; dependency/compiler/native validation is in progress. No extra run
was started. Runner/Docker/Compose/Ubuntu links were verified and development-tool
attribution updated. The same local full CI remains active; no hardware writes.

# Runner digest format clarified

Owner's next build supplied a sha256: prefix plus an extra trailing non-hex
character. Official actions/runner release API verified the v2.338.2 Linux x64
digest. Dockerfile now rejects malformed digests before downloading the archive;
runner guide specifies64 hexadecimal characters without the prefix. No firmware
changes; the existing complete local validation remains running.

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
