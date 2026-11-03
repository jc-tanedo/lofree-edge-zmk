# SPDX-License-Identifier: GPL-3.0-or-later
"""Read diagnostic-only HID feature9. No configuration or firmware writes."""
import importlib.util
import json
from pathlib import Path
import struct
import sys
ROOT=Path(__file__).resolve().parents[1]
FIELDS=('rx_callbacks','rx_bytes','rx_dropped','decode_ok','decode_failed','last_request_id','response_begin','last_response_id','send_ok','send_failed','uart_tx_bytes','uart_tx_zero','rx_ring_used','tx_ring_used','framing_state','transport_present')
FIELDS_V2=("rx_stream_fnv32",)+FIELDS[1:2]+("rpc_stream_fnv32",)+FIELDS[3:11]+("decode_error_detail",)+FIELDS[12:]
DECODE_ERRORS={1:'io error',2:'end-of-stream',3:'zero tag',4:'invalid wire_type',5:'wrong wire type',6:'parent stream too short',7:'varint overflow',8:'integer too large',9:'invalid field type',10:'invalid size',11:'array overflow',12:'bytes overflow',13:'string overflow'}
def parse(data):
    data=bytes(data)
    if len(data)!=67 or data[0]!=9 or data[1] not in (1,2) or data[2]!=0:raise ValueError('Unsupported or incomplete Studio diagnostic report')
    result=dict(zip(FIELDS if data[1]==1 else FIELDS_V2,struct.unpack_from('<16I',data,3)))
    if data[1]==2:
        result['decode_error_code']=result['decode_error_detail']&255
        result['decode_error_framing']=(result['decode_error_detail']>>8)&255
        result['decode_error_name']=DECODE_ERRORS.get(result['decode_error_code'],'none' if not result['decode_error_code'] else 'other')
    return result
def read():
    path=ROOT/'.deps/zmk-tc32/tc32/scripts/telink_ota.py'
    spec=importlib.util.spec_from_file_location('edge_diag_hid',path);ota=importlib.util.module_from_spec(spec);sys.modules[spec.name]=ota;spec.loader.exec_module(ota)
    dev,_=ota.open_device(ota._hid_module(),0x1d50,0x615e,None,'Lofree Edge ZMK')
    try:return parse(dev.get_feature_report(9,67))
    finally:dev.close()
if __name__=='__main__':print(json.dumps(read(),indent=2))
