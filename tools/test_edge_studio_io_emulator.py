# SPDX-License-Identifier: GPL-3.0-or-later
"""Compiled diagnostic feature9 on synthetic flash/USB; no physical hardware."""
from pathlib import Path
import os,runpy
from read_edge_studio_io_diag import parse
from probe_edge_studio_reads import chunks,stream_fnv
ROOT=Path(__file__).resolve().parents[1]
os.environ.setdefault('EDGE_TEST_BUILD','lofree_edge-ble-studio-io-diagnostic')
os.environ['EDGE_TEST_STACKS']='1'
s=runpy.run_path(str(ROOT/'tools/test_edge_studio_emulator.py'))
u,pb,rpc=(s[k] for k in ('u','pb','rpc'));interface=s['state']['vendor_interface']
def stats():return parse(u.control(bytes([0xa1,1,9,3,interface,0,67,0])))
s['advance'](10);before=stats();assert before['decode_ok']>0 and before['rx_bytes']>0
assert before['last_request_id']==before['last_response_id']
assert before['rx_stream_fnv32']==before['rpc_stream_fnv32'] and before['send_failed']==0
request=pb.Request();request.core.get_device_info=True;rpc(request);s['advance'](10)
after=stats();assert after['decode_ok']==before['decode_ok']+1
assert after['rx_bytes']>before['rx_bytes'];assert after['uart_tx_bytes']>before['uart_tx_bytes']
assert after['send_ok']==before['send_ok']+1
assert after['rx_stream_fnv32']==after['rpc_stream_fnv32']
assert after['rx_stream_fnv32']==stream_fnv(before['rx_stream_fnv32'],chunks(request.SerializeToString(),'coalesced')[0])
assert after['rx_ring_used']==0 and after['tx_ring_used']==0 and after['transport_present']==1
assert stats()==after,'Read-only feature changed its counters'
# Invalid bytes are injected only in the emulator, never the physical probe.
assert u.out_ep(s['cdc_out'],bytes([0xab,0,0xad]));s['advance'](20)
invalid=stats();assert invalid['decode_failed']==after['decode_failed']+1
assert invalid['decode_error_name']=='zero tag',invalid
assert invalid['rx_stream_fnv32']==invalid['rpc_stream_fnv32']
# Check observed post-reset margins; full Security suite separately checks RPC paths.
import stack_use
m=s['m'];elf=ROOT/'firmware/build'/os.environ['EDGE_TEST_BUILD']/'zephyr/zmk.elf'
for name,lo,size in stack_use.stacks(str(elf)):
 memory=m.sram[lo-0x840000+4:lo-0x840000+size];first=next((i for i,b in enumerate(memory) if b!=0xaa),len(memory));spare=size-(len(memory)-first)-4
 assert spare>=128,(name,spare)
print('PASS: compiled read-only feature9 counters correlate with RPC ingress/encode/egress; no counter mutation on GET; >=128B post-reset observed stack margin',flush=True)
