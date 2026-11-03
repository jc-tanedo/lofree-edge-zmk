# SPDX-License-Identifier: GPL-3.0-or-later
"""Preserve response framing markers when the Studio TX ring is full."""
from pathlib import Path
from stage_edge_mode import read, replace

def source():
    text=read('app/src/studio/rpc.c','261530cef428321368248a902b8bab97ef6840c1631f4a9543d2379ea48978d2')
    anchor='static int send_response(const zmk_studio_Response *resp) {'
    helper='''/* Framing bytes need the same bounded backpressure handling as payload.
 * A successful pb_encode can leave the ring full; ignoring ring_buf_put's
 * return then loses EOF and leaves the host waiting for an incomplete frame. */
static bool rpc_tx_marker(uint8_t marker, void *user_data) {
    for (int waited = 0; waited <= 50; waited++) {
        if (ring_buf_put(&rpc_tx_buf, &marker, 1) == 1) {
            return true;
        }
        selected_transport->tx_notify(&rpc_tx_buf, 0, true, user_data);
        if (waited == 50) {
            return false;
        }
        k_sleep(K_MSEC(1));
    }
    return false;
}

'''
    text=replace(text,anchor,helper+anchor)
    for marker in ('SOF','EOF'):
        old=f'    uint8_t framing_byte = FRAMING_{marker};' if marker=='SOF' else f'    framing_byte = FRAMING_{marker};'
        old+='\n    ring_buf_put(&rpc_tx_buf, &framing_byte, 1);'
        new=f'''    if (!rpc_tx_marker(FRAMING_{marker}, user_data)) {{
        EDGE_IO_ADD(9, 1);
        k_mutex_unlock(&rpc_transport_mutex);
        return -EIO;
    }}'''
        text=replace(text,old,new)
    text=replace(text, '#include "msg_framing.h"', '#include "msg_framing.h"\n#include "edge_studio_io_diag.h"')
    text=replace(text, '                if (studio_framing_process_byte(&rpc_framing_state, buffer[i])) {', '                EDGE_IO_HASH(2, buffer[i]);\n                if (studio_framing_process_byte(&rpc_framing_state, buffer[i])) {')
    text=replace(text, '        rpc_framing_state = FRAMING_STATE_IDLE;', '#if IS_ENABLED(CONFIG_LOFREE_EDGE_STUDIO_IO_DIAGNOSTICS)\n        if (!status) { edge_studio_io_decode_error(PB_GET_ERROR(&stream), rpc_framing_state); }\n#endif\n        rpc_framing_state = FRAMING_STATE_IDLE;')
    text=replace(text, '        if (status) {\n            zmk_studio_Response resp', '        if (status) {\n            EDGE_IO_ADD(3, 1); EDGE_IO_SET(5, req.request_id);\n            zmk_studio_Response resp')
    text=replace(text, '            LOG_DBG("Decode failed");', '            EDGE_IO_ADD(4, 1);\n            LOG_DBG("Decode failed");')
    text=replace(text, '    pb_ostream_t stream = pb_ostream_for_tx_buf(user_data);', '    EDGE_IO_ADD(6, 1);\n    if (resp->which_type == zmk_studio_Response_request_response_tag) { EDGE_IO_SET(7, resp->type.request_response.request_id); }\n    pb_ostream_t stream = pb_ostream_for_tx_buf(user_data);')
    text=replace(text, '    if (!status) {\n#if !IS_ENABLED', '    if (!status) {\n        EDGE_IO_ADD(9, 1);\n#if !IS_ENABLED')
    text=replace(text, '    selected_transport->tx_notify(&rpc_tx_buf, 1, true, user_data);', '    selected_transport->tx_notify(&rpc_tx_buf, 1, true, user_data);\n    EDGE_IO_ADD(8, 1);')
    text += '''
#if IS_ENABLED(CONFIG_LOFREE_EDGE_STUDIO_IO_DIAGNOSTICS)
uint32_t edge_studio_io_runtime(unsigned int index) {
    switch (index) {
    case 12: return ring_buf_size_get(&rpc_rx_buf);
    case 13: return ring_buf_size_get(&rpc_tx_buf);
    case 14: return rpc_framing_state;
    case 15: return selected_transport != NULL;
    default: return 0;
    }
}
#endif
'''
    return text

def stage(out):
    (out/'edge_studio_rpc.c').write_text(source())
if __name__=='__main__':
    import sys
    stage(Path(sys.argv[1]))
