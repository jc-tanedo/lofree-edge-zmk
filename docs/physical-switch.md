# Physical mode switch

**In progress. Experimental firmware and tools are used entirely at your own risk.** Read [RISK.md](../RISK.md). The published alpha.1 does not follow the slider. The first alpha.2 diagnostic candidate only observes inputs; it does not implement the behavior below.

## Agreed behavior after hardware verification

| Position | Typing | USB data / Studio | Bluetooth |
| --- | --- | --- | --- |
| ON | USB only | Available | Inactive |
| BT | Bluetooth only | Unavailable; cable provides power only | Active profile |
| OFF | None | Unavailable | No advertising/input |

OFF also disables the backlight. Charging remains controlled by the hardware; this work makes no deep-sleep or battery-life claim. A brief restart when the switch moves is acceptable. Save Studio edits before moving it; unsaved changes may be lost. Saved maps, layers and bonds must survive.

The switch will override legacy output-selection bindings. New defaults will leave Fn+4/Fn+5 unassigned. Existing maps will remain readable/importable without a reset; their old output bindings will not override the slider. Keep three Bluetooth profiles and Fn+1/2/3 selection, plus existing pairing, lighting, media, unlock and recovery shortcuts.

## Evidence and remaining gate

Existing instruction analysis of stock mode selection reads port D inputs, including PD5/PD6 and a PD7 prior-state condition. Replaying the stock GPIO initializer in isolation corroborates input-enable mask `0xe0`, output-disable mask `0xe0`, and GPIO function `0xff` for port D. This is synthetic instruction evidence, not a measured slider pinout. The inputs may include cable/power detection.

The diagnostic candidate enables only PD5-PD7 inputs with their outputs disabled and preserves output latches and pull configuration. It retains the previous keyboard, USB, Bluetooth and recovery behavior. It must not be mistaken for the final switch-controlled build.

Next: capture repeated samples in ON, BT and OFF with USB connected, and observe enumeration/radio/power behavior when the cable changes. Confirm which transitions are electrical power cuts. Do not enable automatic selection until the input table is reproducible. Keep raw private investigation artifacts outside the public repository.

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
