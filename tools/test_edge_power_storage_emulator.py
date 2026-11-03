# SPDX-License-Identifier: GPL-3.0-or-later
"""Fault-inject only our synthetic image's power record; no device access."""
import os,runpy,struct,zlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
result=runpy.run_path(str(ROOT/'tools/test_edge_power_emulator.py'))
s=result['s'];m,u,advance,rpc,pb=(s[k] for k in ('m','u','advance','rpc','pb'))
# Inject a synchronous storage API error, without touching synthetic flash.
# Verify the real handler reports failure and clears its write-in-progress gate.
point=s['state']['addresses']['settings_save_one']
prior_hook=m.hooks.get(point)
failed=[]
def fail_save(mm):
    pointer=mm.r[0]
    key=bytes(mm.read(pointer+i,1) for i in range(18))
    if key.startswith(b'edge_power/config\0'):
        failed.append(True);mm.r[0]=(-5)&0xffffffff;mm.r[15]=mm.r[14]&~1
    elif prior_hook:prior_hook(mm)
before=result['read']()
m.hooks[point]=fail_save
try:assert result['save'](dim_seconds=2).status==2
finally:
    if prior_hook is None:m.hooks.pop(point,None)
    else:m.hooks[point]=prior_hook
assert failed and result['read']()==before
assert result['save'](dim_seconds=2).status==0
assert result['save'](dim_seconds=1).status==0
print('PASS: injected settings-save error preserves current settings and permits retry',flush=True)
# The pinned TLSR settings backend has CRC-16/CCITT named records in two
# 8192-byte areas. Recompute that outer CRC so we test our own payload checks.
def ccitt(data):
    crc=0xffff
    for byte in data:
        crc^=byte
        for _ in range(8):crc=(crc>>1)^(0x8408 if crc&1 else 0)
    return crc
assert ccitt(b'123456789')^0xffff==0x906e
name=b'edge_power/config'
records=[]
for base in (0x64000,0x66000):
    if m.flash.mem[base:base+4]!=b'SLG2':continue
    at=base+8
    while at+8<=base+8192:
        magic,n,length,crc,name_crc=struct.unpack_from('<BBHHH',m.flash.mem,at)
        if magic==255 and n==255:break
        if n>40 or at+8+n+length>base+8192:break
        if magic==0x5e and m.flash.mem[at+8:at+8+n]==name:
            assert crc==ccitt(m.flash.mem[at+8:at+8+n+length]),'Fixture journal CRC does not match firmware'
            records.append((at,at+8+n,length))
        at+=(8+n+length+3)&~3
assert records, 'No live power journal record'
original=bytes(m.flash.mem)
def patch(payload):
    m.flash.mem[:]=original
    for at,value,length in records:
        assert length==24
        m.flash.mem[value:value+24]=payload
        crc=ccitt(name+payload)
        m.flash.mem[at+4:at+6]=struct.pack('<H',crc)
def reboot():
    m.reset();assert u.run_until(u.dp_pullup,1000)
    u.bus_reset();u.control(bytes([0,5,1,0,0,0,0,0]));u.control(bytes([0,9,1,0,0,0,0,0]));s['activate_serial']();s['unlock']()
def get():
    r=pb.Request();r.core.edge_get_power=True;return rpc(r).core.edge_power

record=bytearray(original[records[-1][1]:records[-1][1]+24])
assert struct.unpack_from('<I',record,20)[0]==zlib.crc32(record[:20]),'Payload CRC fixture mismatch'
record[4]^=1 # logical payload corruption, with the outer journal CRC kept valid
patch(record);reboot()
p=get();assert (p.schema,p.dim_seconds,p.off_seconds,p.sleep_seconds,p.dim_percent,p.status)==(1,30,120,900,20,0)
assert len(s['keymap']().layers)==3
print('PASS: corrupt power payload falls back to defaults without losing saved layers',flush=True)
record=bytearray(original[records[-1][1]:records[-1][1]+24])
record[:4]=struct.pack('<I',2);record[20:]=struct.pack('<I',zlib.crc32(record[:20]))
patch(record);reboot()
p=get();assert p.status==3
r=pb.Request();r.core.edge_set_power.CopyFrom(p);r.core.edge_set_power.capabilities=0;r.core.edge_set_power.status=0
assert rpc(r).core.edge_power.status==3
assert len(s['keymap']().layers)==3
print('PASS: future power schema remains protected from writes; keymaps remain readable',flush=True)
