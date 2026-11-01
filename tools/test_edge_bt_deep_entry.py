# SPDX-License-Identifier: GPL-3.0-or-later
"""Compiled advertising deep-entry preparation, not physical deep wake."""
import os,runpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
os.environ.setdefault('EDGE_TEST_BUILD','lofree_edge-ble-studio')
os.environ['EDGE_TEST_STACKS']='1'
s=runpy.run_path(str(ROOT/'tools/test_edge_lighting_emulator.py'))
m,u,advance=(s[k] for k in ('m','u','advance'))
import tc32emu as te
import ble_radio
pads=m.pad_levels
def bt(port):
    level,floating=pads(port)
    return ((level&0x1f)|0xc0,floating&0x1f) if port==3 else (level,floating)
m.pad_levels=bt
try:advance(1200)
except te.SoftwareReset:m.reset()
else:raise AssertionError('No guarded BT restart')
radio=ble_radio.Radio(m)
advance(1000)
assert not u.dp_pullup()
entries=[line.split() for line in (ROOT/'firmware/build'/os.environ['EDGE_TEST_BUILD']/'zephyr/zmk.map').read_text().splitlines()]
for name,age in [('last_activity',901000),('adv_since',61000)]:
    addresses=[int(p[0],16) for p in entries if p and p[-1]==name]
    assert len(addresses)==1,(name,addresses)
    at=addresses[0]-0x840000
    m.sram[at:at+8]=((int(m.ms())-age)&((1<<64)-1)).to_bytes(8,'little')
guard=bytes(m.flash.mem[0x68000:0x6b000])
try:advance(1500)
except te.EmuError as error:
    assert 'only suspend (0) is modelled' in str(error),str(error)
else:raise AssertionError('Idle advertising did not request deep sleep')
assert m.analog[0x7e]==0x30 and m.analog[0x26]==8
assert m.analog[0x29]&0x3d==0x3d and m.analog[0x28]&0x80
assert m.analog[0x2a]&0x60==0x60
for port,bit in s['columns']:
    reg=0x0e+port*2+bit//4
    assert (m.analog[reg]>>(2*(bit%4)))&3==2
    assert m.regs_mem[0x580+8*port+2]&(1<<bit)
# A closed key joins its row pull-up to its column pull-down. Unlike the
# driven-low scan model, deep sleep must overcome that pull-up electrically.
# Require a conservative LOW below20% VDD (1M up /100k down gives9.1%).
for port,bit in s['rows']:
    reg=0x0e+port*2+bit//4
    pull=(m.analog[reg]>>(2*(bit%4)))&3
    up={1:1000000,3:10000}.get(pull)
    assert up is not None,('Deep row missing pull-up',port,bit,pull)
    fraction=100000/(up+100000)
    assert fraction<0.2,('Deep key cannot pull row LOW',port,bit,pull,fraction)
assert not u.dp_pullup() and not m.regs_mem[0x780]&0x10
assert bytes(m.flash.mem[0x68000:0x6b000])==guard,'Deep entry changed trial guard flash'
from edge_stack_checks import check
print('DEEP STACK MARGINS:',check(m,ROOT/'firmware/build'/os.environ['EDGE_TEST_BUILD']/'zephyr/zmk.elf'),flush=True)
print('PASS: actual BT advertising policy reaches pad-only deep entry; all six rows/selector wake, column pulls and data/lighting inhibition checked',flush=True)
print('LIMIT: deep wake itself is not modeled; no automatic acceptance or physical wake claim',flush=True)
