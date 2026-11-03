# SPDX-License-Identifier: GPL-3.0-or-later
"""Read diagnostic-only HID feature9. No configuration or firmware writes."""
import importlib.util
import json
from pathlib import Path
import struct
import sys
ROOT=Path(__file__).resolve().parents[1]
FIELDS=('rx_callbacks','rx_bytes','rx_dropped','decode_ok','decode_failed','last_request_id','response_begin','last_response_id','send_ok','send_failed','uart_tx_bytes','uart_tx_zero','rx_ring_used','tx_ring_used','framing_state','transport_present')
def parse(data):
    data=bytes(data)
    if len(data)!=67 or data[:3]!=bytes([9,1,0]):raise ValueError('Unsupported or incomplete Studio diagnostic report')
    return dict(zip(FIELDS,struct.unpack_from('<16I',data,3)))
def read():
    path=ROOT/'.deps/zmk-tc32/tc32/scripts/telink_ota.py'
    spec=importlib.util.spec_from_file_location('edge_diag_hid',path);ota=importlib.util.module_from_spec(spec);sys.modules[spec.name]=ota;spec.loader.exec_module(ota)
    dev,_=ota.open_device(ota._hid_module(),0x1d50,0x615e,None,'Lofree Edge ZMK')
    try:return parse(dev.get_feature_report(9,67))
    finally:dev.close()
if __name__=='__main__':print(json.dumps(read(),indent=2))
