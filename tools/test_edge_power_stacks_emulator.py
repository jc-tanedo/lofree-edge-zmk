# SPDX-License-Identifier: GPL-3.0-or-later
"""Capture first-boot peaks as well as later boots; no device access."""
from pathlib import Path
import os,runpy,sys,json
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'.deps/tc32-devtools/emulator'))
import tc32emu as te,stack_use
os.environ['EDGE_TEST_BUILD']='lofree_edge-ble-studio';os.environ['EDGE_TEST_STACKS']='1'
elf=root/'firmware/build/lofree_edge-ble-studio/zephyr/zmk.elf'
regions=stack_use.stacks(str(elf));snapshots=[]
original=te.Machine.reset

def capture(m,label):
    rows=[]
    for name,lo,size in regions:
        mem=m.sram[lo-te.SRAM_BASE+4:lo-te.SRAM_BASE+size]
        first=next((i for i,b in enumerate(mem) if b!=0xaa),len(mem))
        row={'name':name,'size':size,'used':len(mem)-first,'spare':size-(len(mem)-first)-4}
        rows.append(row)
    snapshots.append({'label':label,'rows':rows})
    (root/'build/reports/power/all-reset-stacks.json').write_text(json.dumps(snapshots,indent=2)+'\n')
    print('ALL-RESET STACKS',label,json.dumps(rows),flush=True)
    for row in rows:assert row['spare']>=128,row

def reset(self,*args,**kwargs):
    if getattr(self,'reset_count',0)>0 and getattr(self,'sram',None) is not None:
        capture(self,f'before reset {self.reset_count+1}')
    return original(self,*args,**kwargs)
te.Machine.reset=reset
state=runpy.run_path(str(root/'tools/test_edge_power_storage_emulator.py'))
capture(state['m'],'after storage faults')
print('PASS: every power/storage boot retains at least128 bytes stack margin, including pre-reset peaks',flush=True)
