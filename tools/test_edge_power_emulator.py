# SPDX-License-Identifier: GPL-3.0-or-later
"""Compiled Studio power settings/lighting/persistence; no physical device access."""
import os,runpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
os.environ.setdefault('EDGE_TEST_BUILD','lofree_edge-ble-studio')
os.environ['EDGE_TEST_STACKS']='1'
os.environ['EDGE_TEST_POWER']='1'
s=runpy.run_path(str(ROOT/'tools/test_edge_studio_emulator.py'))
m,u,advance,rpc,pb=(s[k] for k in ('m','u','advance','rpc','pb'))
pressed=s['state']['pressed']
def read():
    r=pb.Request();r.core.edge_get_power=True
    return rpc(r).core.edge_power

def save(**values):
    r=pb.Request();r.core.edge_set_power.CopyFrom(read())
    r.core.edge_set_power.capabilities=0;r.core.edge_set_power.status=0
    for k,v in values.items():setattr(r.core.edge_set_power,k,v)
    return rpc(r).core.edge_power

p=read();assert (p.schema,p.dim_seconds,p.off_seconds,p.sleep_seconds,p.dim_percent)==(1,30,120,900,20),p
assert p.capabilities==7
assert save(off_seconds=1).status==1
assert read()==p,'Rejected settings changed the record'
assert save(dim_seconds=1,off_seconds=2,sleep_seconds=3,dim_percent=20).status==0
assert read().off_seconds==2
print('PASS: compiled secured settings get/set, capabilities, ordering and authoritative readback',flush=True)
# A USB connection must remain available at every lighting deadline.
# Accelerate only the activity timestamp; execute the real periodic worker/PWM path.
matches=[int(line.split()[0],16) for line in (ROOT/'firmware/build'/os.environ['EDGE_TEST_BUILD']/'zephyr/zmk.map').read_text().splitlines() if line.split() and line.split()[-1]=='last_activity']
assert len(matches)==1,matches
addr=matches[0]
def idle_for(ms):
    now=int(m.ms())
    value=(now-ms)&((1<<64)-1)
    offset=addr-0x840000
    m.sram[offset:offset+8]=value.to_bytes(8,'little')
    advance(1050)

# Establish manual-off explicitly; the other harness intentionally resets before
# the asynchronous backlight-save debounce is guaranteed to have elapsed.
def toggle_light():
    pressed.add((5,10));advance(20);pressed.add((0,0));advance(30);pressed.clear();advance(30)
if m.regs_mem[0x780]&0x10: toggle_light()
assert not m.regs_mem[0x780]&0x10
idle_for(4000);assert not m.regs_mem[0x780]&0x10,'Idle lit manually disabled backlight'
toggle_light()
assert m.regs_mem[0x780]&0x10
base_brightness=round((255-m.read(0x8007a4,2))*100/255)
idle_for(1000)
# Poll happens within one second, so use a wide off interval for dim testing.
assert save(off_seconds=10,sleep_seconds=20).status==0
idle_for(1500)
assert m.regs_mem[0x780]&0x10
expected_cmp=255-((base_brightness*20//100)*255//100)
assert m.read(0x8007a4,2)==expected_cmp,('Dim brightness mismatch',base_brightness,m.read(0x8007a4,2),expected_cmp)
idle_for(11000);assert not m.regs_mem[0x780]&0x10
pressed.add((0,0));advance(30)
assert m.regs_mem[0x780]&0x10
idle_for(30000);assert m.regs_mem[0x780]&0x10,'Held key dimmed'
pressed.clear();advance(30)
assert read().off_seconds==10
print('PASS: real worker dim/off/manual-off/held-key policy, activity restoration and USB continuity',flush=True)
# Confirm this synthetic emulator image through its real OTA protocol before a third boot.
import sys
sys.path.insert(0,str(ROOT/'.deps/zmk-tc32/tc32/scripts'))
import telink_ota
interface=s['state']['vendor_interface'];ep=s['state']['hids'][1]['endpoints'][0]&127
for command in (0xff07,0xff03):
    frame=telink_ota.command_frame(command)
    u.control(bytes([0x21,9,5,2,interface,0,len(frame),0]),out=frame)
    for _ in range(5000):
        advance(1);reply=u.in_ep(ep)
        if reply and int.from_bytes(reply[9:11],'little')==command:
            assert reply[29]==0;break
    else:raise AssertionError('No emulated confirmation')
m.reset();assert u.run_until(u.dp_pullup,1000)
u.bus_reset();u.control(bytes([0,5,1,0,0,0,0,0]));u.control(bytes([0,9,1,0,0,0,0,0]));s['activate_serial']();s['unlock']()
p=read();assert (p.dim_seconds,p.off_seconds,p.sleep_seconds,p.dim_percent)==(1,10,20,20)
assert len(s['keymap']().layers)==3
print('PASS: saved power settings, mappings and layers survive reboot; retained slot preserved',flush=True)
