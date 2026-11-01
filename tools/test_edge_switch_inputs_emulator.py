"""Read actual diagnostic HID snapshots with synthetic PD5-PD7 levels.

This proves GPIO observation and report compatibility, not the slider wiring.
Runs the existing compiled USB/matrix/lighting checks before input snapshots.
"""
import os
from pathlib import Path
import runpy
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))
from lofree_edge.board_status import decode_switch_status

os.environ.setdefault('EDGE_TEST_BUILD', 'lofree_edge-ble-studio-switch-diagnostic')
state = runpy.run_path(str(ROOT / 'tools/test_edge_lighting_emulator.py'))
m, u, advance = (state[name] for name in ('m', 'u', 'advance'))
interface = state['vendor_interface']
pads = m.pad_levels
level = 0xe0

def switch_pads(port):
    value, floating = pads(port)
    if port == 3:
        value = (value & 0x1f) | level
        floating &= 0x1f
    return value, floating

m.pad_levels = switch_pads
reset_count = m.reset_count
pulls = bytes(m.analog[0x14:0x16])
for combination in range(8):
    level = combination << 5
    advance(10)
    report = u.control(bytes([0xa1, 1, 7, 3, interface, 0, 32, 0]))
    status = decode_switch_status(report)
    assert status['switch_diagnostics'], 'Wrong candidate: switch diagnostics disabled'
    observed = status['switch_inputs']
    assert observed['pd_input'] & 0xe0 == level
    assert observed['pd_input'] & 0x1f == 0, 'Unrelated matrix inputs exposed'
    assert observed['pd_input_enable'] & 0xe0 == 0xe0
    assert observed['pd_output_disable'] & 0xe0 == 0xe0
    assert observed['pd_gpio_function'] & 0xe0 == 0xe0
    assert bytes(m.analog[0x14:0x16]) == pulls, 'Snapshot altered GPIO pulls'
    assert m.reset_count == reset_count, 'Diagnostics unexpectedly switched/restarted'
print('PASS: all eight synthetic PD5-PD7 combinations reach real HID schema2; outputs stay disabled, pulls unchanged, no mode restart')
