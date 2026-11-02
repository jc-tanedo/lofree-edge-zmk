# SPDX-License-Identifier: GPL-3.0-or-later
"""Run actual compiled security RPC/storage/core-lock behavior, with synthetic flash only."""
import os,runpy,sys,struct,zlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
os.environ.setdefault('EDGE_TEST_BUILD','lofree_edge-ble-studio')
os.environ['EDGE_TEST_SECURITY']='1'
s=runpy.run_path(str(ROOT/'tools/test_edge_studio_emulator.py'))
m,u,advance,rpc,pb=(s[k] for k in ('m','u','advance','rpc','pb'))
def get():
    r=pb.Request();r.core.edge_get_security=True;return rpc(r).core.edge_security
def set_policy(value,schema=1,status=0):
    r=pb.Request();r.core.edge_set_security.schema=schema;r.core.edge_set_security.require_unlock=value;r.core.edge_set_security.status=status
    return rpc(r).core.edge_security
def lock_state():
    r=pb.Request();r.core.get_lock_state=True;return rpc(r).core.get_lock_state
assert (get().schema,get().require_unlock)==(1,1)
for value,schema,status in [(2,1,0),(0,2,0),(0,1,1)]:
    assert set_policy(value,schema,status).status==1
assert get().require_unlock==1
# Fail storage at the actual synchronous backend API.
point=s['state']['addresses']['settings_save_one'];prior=m.hooks.get(point);failed=[]
def fail_save(mm):
    key=bytes(mm.read(mm.r[0]+i,1) for i in range(21))
    if key.startswith(b'edge_security/config\0'):
        failed.append(True);mm.r[0]=(-5)&0xffffffff;mm.r[15]=mm.r[14]&~1
    elif prior:prior(mm)
m.hooks[point]=fail_save
try:assert set_policy(0).status==2
finally:
    if prior is None:m.hooks.pop(point,None)
    else:m.hooks[point]=prior
assert failed and get().require_unlock==1
assert set_policy(0).status==0 and get().require_unlock==0 and lock_state()==1
# Upstream disconnect path invokes core_lock(); policy must override it.
control=s['cdc_control']['number']
u.control(bytes([0x21,0x22,0,0,control,0,0,0]));advance(100)
s['activate_serial']();assert lock_state()==1
assert len(s['keymap']().layers)==3
print('PASS: secured defaults, input validation, storage failure/retry, disabling and disconnect immunity',flush=True)
# Confirm only synthetic emulated flash to exercise further reboot persistence.
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
    else:raise AssertionError('No emulated acceptance response')
def reboot():
    m.reset();assert u.run_until(u.dp_pullup,1000)
    u.bus_reset();u.control(bytes([0,5,1,0,0,0,0,0]));u.control(bytes([0,9,1,0,0,0,0,0]));s['activate_serial']()
reboot();assert lock_state()==1 and get().require_unlock==0
assert len(s['keymap']().layers)==3
assert set_policy(1).status==0 and lock_state()==0
r=pb.Request();r.core.edge_set_security.schema=1
assert rpc(r).meta.simple_error==1
s['unlock']();assert get().require_unlock==1
reboot();assert lock_state()==0
s['unlock']();assert get().require_unlock==1
print('PASS: disabled policy persists without Fn+U; enabling immediately locks; default protection restored across reboot',flush=True)
# Verify corrupt/future payloads fail closed, preserving the existing keymap.
def ccitt(data):
    crc=0xffff
    for b in data:
        crc^=b
        for _ in range(8):crc=(crc>>1)^(0x8408 if crc&1 else 0)
    return crc
assert set_policy(0).status==0
original=bytes(m.flash.mem);name=b'edge_security/config';records=[]
for base in (0x64000,0x66000):
    if m.flash.mem[base:base+4]!=b'SLG2':continue
    at=base+8
    while at+8<=base+8192:
        magic,n,length,crc,_=struct.unpack_from('<BBHHH',m.flash.mem,at)
        if magic==255 and n==255:break
        if n>40 or at+8+n+length>base+8192:break
        if magic==0x5e and m.flash.mem[at+8:at+8+n]==name:records.append((at,at+8+n,length))
        at+=(8+n+length+3)&~3
assert records
for future in (False,True):
    m.flash.mem[:]=original
    for at,value,length in records:
        assert length==12
        payload=bytearray(struct.pack('<II',2 if future else 1,0))
        payload+=struct.pack('<I',zlib.crc32(payload) if future else 0)
        m.flash.mem[value:value+12]=payload
        m.flash.mem[at+4:at+6]=struct.pack('<H',ccitt(name+payload))
    reboot();assert lock_state()==0;s['unlock']()
    p=get();assert p.require_unlock==1 and p.status==(3 if future else 0)
    if future:assert set_policy(0).status==3
    assert len(s['keymap']().layers)==3
print('PASS: corrupt/future security payload fails closed; future schema cannot be overwritten; mappings retained',flush=True)
