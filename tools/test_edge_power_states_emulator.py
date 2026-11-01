# SPDX-License-Identifier: GPL-3.0-or-later
"""USB-host suspend and deep-entry preparation; deep wake is NOT modeled."""
import os,runpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
result=runpy.run_path(str(ROOT/'tools/test_edge_power_emulator.py'))
s=result['s'];m,u,advance=(s[k] for k in ('m','u','advance'))
import tc32emu as te
# This is intentionally real modeled uptime, not an edited kernel clock.
advance(max(0,20100-int(m.ms())))
u.suspend()
end=m.ms()+11000
while m.ms()<end and m.asleep is None: advance(1)
assert m.asleep is not None,'USB host suspend did not reach chip suspend'
assert u.dp_pullup(),'Host sleep detached USB'
assert m.analog[0x26]&0x38==0x38,'Expected pad/core/timer wake'
u.resume();advance(1500)
assert m.asleep is None
s['activate_serial']()
assert result['read']().off_seconds==10
print('PASS: compiled USB-host suspend/core resume without USB detach, power settings still readable',flush=True)

pads=m.pad_levels
selector=[0xa0]
def levels(port):
    level,floating=pads(port)
    return ((level&0x1f)|selector[0],floating&0x1f) if port==3 else (level,floating)
m.pad_levels=levels
try:advance(1200)
except te.SoftwareReset:m.reset()
else:raise AssertionError('OFF selector did not restart')
try:advance(22000)
except te.EmuError as error:
    assert 'only suspend (0) is modelled' in str(error),str(error)
else:raise AssertionError('OFF never attempted deep sleep')
assert m.analog[0x7e]==0x30 and m.analog[0x26]==8
assert m.analog[0x2a]&0x60==0x60,'Selector wake not armed'
# OFF wake must exclude all six rows, including a row whose analog enable
# might have survived an earlier sleep. No key should wake OFF.
assert m.analog[0x29]&0x3d==0 and m.analog[0x28]&0x80==0
for port,bit in s['state']['columns']:
    reg=0x0e+port*2+bit//4
    assert (m.analog[reg]>>(2*(bit%4)))&3==2
    assert m.regs_mem[0x580+8*port+2]&(1<<bit)
assert not u.dp_pullup() and not m.regs_mem[0x780]&0x10
print('PASS: compiled OFF deep-entry mode, selector-only wake mask, column pulls/output inhibition and lighting/data off',flush=True)
print('LIMIT: emulator stops at deep entry; physical deep wake, current and cable detection remain hardware gates',flush=True)
