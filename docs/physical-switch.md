# Physical mode switch

**Implemented; owner-validated alpha.2 candidate. Experimental firmware and tools are used entirely at your own risk.** Read [RISK.md](../RISK.md). The published alpha.1 does not follow the slider. The first alpha.2 diagnostic candidate only observes inputs; it does not implement the behavior below.

## Validated behavior

| Position | Typing | USB data / Studio | Bluetooth |
| --- | --- | --- | --- |
| ON | USB only | Available | Inactive |
| BT | Bluetooth only | Unavailable; cable provides power only | Active profile |
| OFF | None | Unavailable | No advertising/input |

OFF also disables the backlight. Charging remains controlled by the hardware; this work makes no deep-sleep or battery-life claim. A brief restart when the switch moves is acceptable. Save Studio edits before moving it; unsaved changes may be lost. Saved maps, layers and bonds must survive.

The switch overrides legacy output-selection bindings. New defaults leave Fn+4/Fn+5 unassigned. Existing maps will remain readable/importable without a reset; their old output bindings will not override the slider. Keep three Bluetooth profiles and Fn+1/2/3 selection, plus existing pairing, lighting, media, unlock and recovery shortcuts.

## Evidence and remaining gate

Existing instruction analysis of stock mode selection reads port D inputs, including PD5/PD6 and a PD7 prior-state condition. Replaying the stock GPIO initializer in isolation corroborates input-enable mask `0xe0`, output-disable mask `0xe0`, and GPIO function `0xff` for port D. This is synthetic instruction evidence, not a measured slider pinout. The inputs may include cable/power detection.

The diagnostic candidate enables only PD5-PD7 inputs with their outputs disabled and preserves output latches and pull configuration. It retains the previous keyboard, USB, Bluetooth and recovery behavior. It must not be mistaken for the final switch-controlled build.

The input table and controller behavior are now validated; see [the exact-image hardware record](validation/v0.1.0-alpha.2.md). Keep raw private investigation artifacts outside the public repository.

## Diagnostic status interface

HID feature report 7 remains 32 bytes. Schema byte 3 is now `2`; bytes 0-23 keep their previous meaning. New fields are:

| Byte | Value |
| --- | --- |
| 24 | Port D input bits 5-7; unrelated matrix bits are masked out |
| 25 | Port D input-enable bits 5-7; other bits are masked out |
| 26 | Diagnostic input initialization enabled (0/1) |
| 27-31 | Reserved, zero |

No arbitrary register access, GPIO writes, flash writes, key events or bond keys are exposed by the status reader. OTA reports and the existing retained-image read window are unchanged. The decoder accepts schema1 without interpreting its reserved bytes as switch observations.

```sh
EDGE_SWITCH_DIAGNOSTIC=1 sh tools/build_edge_zmk.sh --ble-studio
EDGE_TEST_BUILD=lofree_edge-ble-studio-switch-diagnostic .venv/bin/python tools/test_edge_switch_inputs_emulator.py
.venv/bin/python tools/edge_switch_status.py --position ON
```

The diagnostic build goes into its own ignored firmware build directory. Install only after a separate exact-SHA hardware handoff. Before repeated position/power-cycle tests, observe the trial boot count and obtain explicit acceptance approval after baseline typing, retained-image checks and flash self-test. Do not disable or bypass rollback guards to run the investigation.

Progress and physical evidence are tracked in [issue #3](https://github.com/jc-tanedo/lofree-edge-zmk/issues/3). Completion requires the final policy, compiled tests, physical acceptance and merged implementation; diagnostics alone are insufficient.

## Physical observations in progress

Frozen diagnostic SHA-256: `cd4a22d3fd5737eb2348ed7deacd29623e72b33d3b0a7621a57ca6689fcee74f`. The owner installed it from stock and verified typing, Fn/media, Caps/backlight, saved Studio mappings/layers and Bluetooth typing.

| Position / cable | PD5 | PD6 | PD7 | Evidence |
| --- | --- | --- | --- | --- |
| ON / USB connected | High | High | High | Ten stable live snapshots; input-enable/output-disable mask 0xe0, function 0xff |
| BT / USB connected | Low | High | High | Ten stable live snapshots, mask 0xc0; matches stock BLE branch |
| OFF / USB connected | High | Low | High | Ten stable live snapshots; owner confirms USB remains powered |

One position alone does not establish pin roles. The owner explicitly approved diagnostic acceptance after baseline checks. The flash self-test and retained-image integrity check passed; confirmation cleared count 1 to 0. Repeated position measurements can now proceed, with recovery still not guaranteed.

### Repeated physical captures (2026-11-01)

Ten samples per position gave ON=0xe0, BT=0xc0, OFF=0xa0 for masked PD inputs;
ON and BT reproduced after moving away and back. These are actual device
observations with USB connected, not emulator results. PD5 low takes Bluetooth
precedence in the stock decoder; otherwise PD6 low selects OFF. PD7 remained
high and its role is unverified; the new controller leaves PD7 untouched.

At that earlier diagnostic stage, the accepted image was cd4a22d3. The final controller is now installed,
accepted and validated as recorded above.

## Controller implementation

The board-owned `edge_mode` module initializes only the PD5/PD6 inputs and
fails closed if their input/output/function configuration is wrong. Staged,
hash-checked native BLE hooks settle the selection at boot and restart through
the existing trial guard after a stable movement. Pending output reports receive
a best-effort release before quiescing. Endpoint routing never falls back onto
the other transport, and legacy output bindings retain their IDs but do nothing.
Factory Fn+4/Fn+5 are unassigned; saved maps are not reset. Fn+1/2/3 select the
three profiles in BT mode. ON has no active Bluetooth stack.

Unknown/OFF/transition states suppress matrix callbacks and lighting. OFF is a
software inactive state while USB supplies power, not a deep-sleep implementation.
Set the slider to ON for Studio, USB diagnostics, installation or Fn+Space stock
return. Save edits before moving the switch; each movement may restart firmware.

Validation commands (no physical keyboard access):

```sh
sh tools/build_edge_zmk.sh --ble-studio
PYTHONPATH=src .venv/bin/python -m unittest discover -s tests
EDGE_TEST_BUILD=lofree_edge-ble-studio .venv/bin/python tools/test_edge_ble_emulator.py
```

Compiled checks do not establish physical RF performance or battery behavior.
The exact controller candidate is now accepted and owner-tested. RF performance and
current draw were not independently measured; sleep remains unimplemented.
