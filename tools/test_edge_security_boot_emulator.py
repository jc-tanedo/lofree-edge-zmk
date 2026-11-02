# SPDX-License-Identifier: GPL-3.0-or-later
"""Fast startup regression: inject the decoded disabled policy at settings-load entry.
Full security storage/reboot tests separately exercise the on-flash record.
"""
from pathlib import Path
import os,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.deps/tc32-devtools/emulator'))
import tc32emu as te,run_boot,stack_use
build=ROOT/'firmware/build'/os.environ.get('EDGE_TEST_BUILD','lofree_edge-ble-studio')/'zephyr'
image=(build/'zmk.ota.bin').read_bytes();elf=str(build/'zmk.elf')
addr,sizes=run_boot.symbols(elf)
flash=te.Flash();flash.mem[:len(image)]=image;flash.mem[8:12]=bytes(4);flash.mem[0x20000:0x20000+len(image)]=image
m=te.Machine(flash,symbols=addr,max_log=10)
regions,_=stack_use.paint(m,elf,addr)
policy=[int(p[0],16) for line in (build/'zmk.map').read_text().splitlines() if (p:=line.split()) and p[-1]=='require_unlock']
assert len(policy)==1
injected=[]
def decoded_policy(mm):
    mm.sram[policy[0]-te.SRAM_BASE]=0 if os.environ.get('EDGE_SECURITY_BOOT_DISABLED','1')=='1' else 1;injected.append(True)
m.hooks[addr['settings_load']]=decoded_policy
def capture():
    rows=[]
    for name,lo,size in regions:
        memory=m.sram[lo-te.SRAM_BASE+4:lo-te.SRAM_BASE+size]
        first=next((i for i,b in enumerate(memory) if b!=0xaa),len(memory))
        rows.append((name,size,size-(len(memory)-first)-4))
    print('STACK MARGINS',rows,flush=True)
    return rows
def fatal(mm):
    capture()
    raise AssertionError('Disabled-policy startup hit '+mm.symbolize(mm.r[15]))
for name in run_boot.FATAL:
    if name in addr:m.hooks[addr[name]]=fatal
m.run_ms(300,idle_ranges=run_boot.idle_ranges(addr,sizes))
assert injected
for name,size,spare in capture():assert spare>=128,(name,size,spare)
print('PASS: disabled-policy settings commit boots with >=128 bytes observed stack margin',flush=True)
