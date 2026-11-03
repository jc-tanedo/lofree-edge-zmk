# SPDX-License-Identifier: GPL-3.0-or-later
"""Compiled read-only installer identity feature, synthetic flash/USB only."""
import os,runpy,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
os.environ.setdefault('EDGE_TEST_BUILD','lofree_edge-ble-studio')
os.environ['EDGE_TEST_STACKS']='1'
s=runpy.run_path(str(ROOT/'tools/test_edge_lighting_emulator.py'))
u=s['u'];interface=s['vendor_interface'];m=s['m']
request=bytes([0xa1,1,10,3,interface,0,16,0])
before=bytes(s['flash'].mem)
a=bytes(u.control(request));assert len(a)==16 and a[:4]==bytes([10,69,73,1]),a
size,crc,slot=struct.unpack_from('<III',a,4)
image=(ROOT/'firmware/build'/os.environ['EDGE_TEST_BUILD']/'zephyr/zmk.ota.bin').read_bytes()
assert size==len(image) and crc==int.from_bytes(image[-4:],'little') and slot in (0,0x20000),(size,crc,slot)
assert bytes(s['flash'].mem)==before,'Identity feature wrote flash'
assert bytes(u.control(request))==a
import stack_use
elf=ROOT/'firmware/build'/os.environ['EDGE_TEST_BUILD']/'zephyr/zmk.elf'
for name,lo,size in stack_use.stacks(str(elf)):
 memory=m.sram[lo-0x840000+4:lo-0x840000+size];first=next((i for i,b in enumerate(memory) if b!=0xaa),len(memory));spare=size-(len(memory)-first)-4
 assert spare>=128,(name,spare)
print('PASS: compiled image identity reports size/trailer CRC/slot, writes no flash, >=128B observed stack margins',flush=True)
# Exercise real HID OTA replies/flags in the same order used by the browser.
import sys
sys.path.insert(0,str(ROOT/'.deps/zmk-tc32/tc32/scripts'))
import telink_ota
ep=s['hids'][1]['endpoints'][0]&127
for command in (0xff00,0xff07,0xff03,0xff00):
 frame=telink_ota.command_frame(command)
 u.control(bytes([0x21,9,5,2,interface,0,len(frame),0]),out=frame)
 for _ in range(5000):
  s['advance'](1);reply=u.in_ep(ep)
  if reply and int.from_bytes(reply[9:11],'little')==command:
   assert reply[29]==0 and reply[21:23]==b'ZC' and reply[30]&0x41==0x41
   if command==0xff07:assert reply[18]&8
   if command==0xff03:assert reply[18]&4 and reply[17]==0
   break
 else:raise AssertionError('No compiled installer OTA response')
assert reply[18]&4 and reply[17]==0
print('PASS: actual HID version/self-test/confirm/readback reports match browser offsets; synthetic image accepted/count0',flush=True)
