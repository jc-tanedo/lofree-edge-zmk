# Studio unlock policy

Experimental firmware and tools. Use at your own risk. [Risk notice](../RISK.md).

## User behavior — unreleased, hardware test pending

Studio's Security tab is beside Power. “Require physical unlock before editing”
is enabled by default. Unlock with Fn+U in the default keymap, or your remapped
Unlock Studio binding. Upstream locking relocks on disconnect and after600s
of Studio inactivity.

Disabling the requirement is an explicit, confirmed device setting. Software
with access to the Studio connection can then edit without a key press, even
after reconnect/reboot. It does not enable Bluetooth Studio: the physical ON
position remains required. Enabling the requirement locks the current session
immediately. Save/discard keymap edits before changing policy.

Studio warns if locking is enabled and the current keymap has no direct Unlock
Studio binding, including after assignment, layer deletion or an import removes
the last binding. The warning is conservative if firmware cannot report its
policy. Enabling without a binding also warns in the confirmation. Warnings do
not prohibit the change. Presence checks do not prove a layer/key is physically
reachable or detect unlocks hidden in custom macros; keep an accessible binding.
Without one, a later lock can prevent editing and may require reset/recovery,
which is not guaranteed.

Older firmware shows an unsupported message instead of a toggle that only
changes browser state. These settings require a new firmware image. The owner’s
installed145f81d2 image has not been changed by implementation or mock tests.

## Protocol and storage

Additive project core requests18=get and19=set; response17=EdgeSecurity.
Fields1–3 are schema, require_unlock (uint32 constrained to0/1), and status.
Schema1. Status0=success,1=invalid,2=storage/busy,3=future stored schema.
Both handlers use upstream secured RPC authorization. A locked session cannot
disable its own unlock requirement. The existing connection, protobuf codecs,
framing and mutex are reused; no second serial reader.

`edge_security/config` is a separate12-byte settings record: LE32 schema,
LE32 requirement and CRC32 over the first8 bytes. Missing, malformed, invalid,
corrupt and future records require unlock. Future records cannot be overwritten.
A failed save preserves the previous policy. No keymap, bond or Power reset is
required. Downgrade to older firmware ignores the record and uses its normal
locking; upgrading again reads the saved policy.

A hash-checked transformation of pinned MIT-licensed Studio core retains upstream
notifications/authorization and applies the policy in get/set lock-state paths.
Disabling prevents idle/disconnect relocking; enabling calls upstream lock.
The settings commit queues an unlock notification on the existing system work
queue when boot loads a disabled policy, so an early Studio client cannot retain
a stale locked view. A changed policy returns busy while this boot work is
pending/running, preventing a late boot unlock from racing re-enable.
UI saves are confirmed; readback verifies disabling, while enabling returns the
stored response then requires physical unlock before another secured read.

## Validation boundary

Compiled emulator tests exercise secured authorization, default protection,
input rejection, storage failure/retry, disconnect policy, disabled-policy reboot,
immediate relock, re-enabled reboot, corrupt/future fail-closed records and
preservation of saved mappings/layers. All flash inputs are synthetic.
Browser QA uses a transport that cannot access real hardware. Physical tests
against the new exact OTA are required separately; earlier power hardware
results do not certify this changed binary.

### Startup stack regression

Calling the upstream unlock/event encoder synchronously from settings commit
exhausted the768-byte main stack on a disabled-policy boot. The fast compiled
`test_edge_security_boot_emulator.py` reproduced the sentinel failure twice; the
locked-policy control passed. Deferring to the existing1536-byte work queue
passed without enlarging stacks (observed main spare364B, work-queue spare548B
in the short startup scenario). Full RPC/storage runs measure additional paths;
this short test alone does not certify all stack use or hardware.
