# SPDX-License-Identifier: GPL-3.0-or-later
"""Regression for Linux's zero-duration HID SET_IDLE initialization requests.

Exercises compiled class handling, not silicon EP0 stall behavior or host latency.
"""
import runpy
from pathlib import Path
root=Path(__file__).resolve().parents[1]
s=runpy.run_path(str(root/'tools/test_edge_lighting_emulator.py'))
u=s['u']
from usb_model import UsbError
for interface in (s['keyboard_interface'],s['vendor_interface']):
    try:
        u.control(bytes([0x21,0x0a,0,0,interface,0,0,0]))
    except UsbError as e:
        raise AssertionError(f'SET_IDLE duration0 report0 must complete on HID interface {interface}: {e}') from e
    try:
        u.control(bytes([0x21,0x0a,0,1,interface,0,0,0]))
    except UsbError as e:
        assert str(e)=='STALL', str(e)
    else:
        raise AssertionError('Nonzero periodic idle unexpectedly accepted without SOF')
print('PASS: compiled HID interfaces accept change-only SET_IDLE without SOF')
