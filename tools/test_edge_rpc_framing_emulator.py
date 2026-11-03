# SPDX-License-Identifier: GPL-3.0-or-later
"""Exercise failed EOF insertion at the compiled response writer call site.
Synthetic flash/USB only. A one-shot zero-byte ring insertion models a full ring;
this tests the actual TC32 retry, not physical host timing.
"""
from pathlib import Path
import os,runpy
ROOT=Path(__file__).resolve().parents[1]
os.environ.setdefault('EDGE_TEST_BUILD','lofree_edge-ble-studio')
os.environ['EDGE_TEST_STACKS']='1'
def check(s):
    m,pb,rpc=(s[k] for k in ('m','pb','rpc'))
    addresses=s['state']['addresses']
    mapping=ROOT/'firmware/build'/os.environ['EDGE_TEST_BUILD']/'zephyr/zmk.map'
    def section(name):
        hits=[int(p[0],16) for line in mapping.read_text().splitlines()
              if (p:=line.split()) and 'app/libapp.a(' in line
              and ('(rpc.c.obj)' in line or '(edge_studio_rpc.c.obj)' in line)
              and line.rstrip().endswith('(.text.'+name+')')]
        assert len(hits)==1,(name,hits)
        return hits[0]
    injected=[];armed=[];prior={}
    def install(point,callback):
        prior[point]=m.hooks.get(point);m.hooks[point]=callback
    # LLVM specializes the TU-local inline helpers. Locate the RPC object's
    # copy, not the identically named CDC helper in the code-symbol dictionary.
    if 'rpc_tx_marker' in addresses:
        marker=addresses['rpc_tx_marker'];point=section('ring_buf_put_ptr')
        def entering(mm):
            if mm.r[0]==0xad and not injected:armed.append(True)
        install(marker,entering)
        def full_once(mm):
            if armed and not injected:
                injected.append(True);mm.r[0]=0;mm.r[15]=mm.r[14]&~1
        install(point,full_once)
    else:
        point=section('ring_buf_put')
        def full_once(mm):
            # Original specialized helper takes only the one-byte data pointer.
            if not injected and mm.read(mm.r[0],1)==0xad:
                injected.append(True);mm.r[0]=0;mm.r[15]=mm.r[14]&~1
        install(point,full_once)
    try:
        req=pb.Request();req.behaviors.get_behavior_details.behavior_id=s['behavior_ids'][0]
        result=rpc(req)
        assert injected,'Did not exercise raw EOF insertion'
        assert result.behaviors.get_behavior_details.id==s['behavior_ids'][0]
    finally:
        for point,previous in prior.items():
            if previous is None:m.hooks.pop(point,None)
            else:m.hooks[point]=previous
    print('PASS: compiled action-detail response completes after one failed EOF insertion',flush=True)

if __name__=='__main__':
    check(runpy.run_path(str(ROOT/'tools/test_edge_studio_emulator.py')))
