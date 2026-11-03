# SPDX-License-Identifier: GPL-3.0-or-later
"""Bounded request framing on compiled TC32, synthetic USB only.

This checks recovery boundaries; it does not reproduce the physical zero-tag bug.
"""
import os
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault('EDGE_TEST_BUILD', 'lofree_edge-ble-studio-frame-buffer')
s = runpy.run_path(str(ROOT / 'tools/test_edge_studio_emulator.py'))
u, pb, rpc, tick = (s[k] for k in ('u', 'pb', 'rpc', 'tick'))


def send(data):
    for offset in range(0, len(data), 16):
        for _ in range(100):
            if u.out_ep(s['cdc_out'], data[offset:offset + 16]):
                break
            tick()
        else:
            raise AssertionError('CDC OUT did not rearm')
        tick()
    for _ in range(20):
        tick()


for label, frame in (
    ('zero tag', bytes([0xab, 0, 0xad])),
    ('oversize', bytes([0xab]) + bytes([1]) * 160 + bytes([0xad])),
    ('escaped markers', bytes([0xab, 0xac, 0xab, 0xac, 0xad, 0xad])),
    ('empty', bytes([0xab, 0xad])),
    ('abandoned frame', bytes([0xab, 1, 2])),
):
    send(frame)
    request = pb.Request()
    request.core.get_device_info = True
    result = rpc(request)
    assert result.HasField('core'), (label, result)
    print(f'PASS: valid request after {label}', flush=True)
print('PASS: compiled bounded frame recovery; physical failure remains a hardware gate', flush=True)
