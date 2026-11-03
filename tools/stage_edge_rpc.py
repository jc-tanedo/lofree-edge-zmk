# SPDX-License-Identifier: GPL-3.0-or-later
"""Stage bounded request decoding and reliable response framing for Edge."""
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
    # Decode a bounded, complete frame rather than exposing an unknown-length
    # callback stream to nanopb. Storage belongs to rpc_main's stack, not static RAM.
    start=text.index('static bool rpc_read_cb(')
    end=text.index('RING_BUF_DECLARE(rpc_tx_buf,',start)
    text=text[:start]+"""/* Drain oversize frames through EOF before rejecting, preserving the next
 * request boundary. This buffer is bounded independently of protobuf lengths. */
#define EDGE_RPC_FRAME_CAPACITY 128
BUILD_ASSERT(zmk_studio_Request_size <= EDGE_RPC_FRAME_CAPACITY);
static bool rpc_receive_frame(uint8_t *frame, size_t *length) {
    bool overflow = false;
    *length = 0;
    while (true) {
        uint8_t *buffer;
        uint32_t len = ring_buf_get_claim(&rpc_rx_buf, &buffer, 1);
        if (!len) {
            ring_buf_get_finish(&rpc_rx_buf, 0);
            k_sem_take(&rpc_rx_sem, K_FOREVER);
            continue;
        }
        uint8_t byte = buffer[0];
        EDGE_IO_HASH(2, byte);
        if (byte == FRAMING_SOF && rpc_framing_state != FRAMING_STATE_ESCAPED) {
            rpc_framing_state = FRAMING_STATE_IDLE;
            *length = 0;
            overflow = false;
        }
        bool data = studio_framing_process_byte(&rpc_framing_state, byte);
        ring_buf_get_finish(&rpc_rx_buf, 1);
        if (data) {
            if (*length < EDGE_RPC_FRAME_CAPACITY) { frame[(*length)++] = byte; }
            else { overflow = true; }
        }
        if (rpc_framing_state == FRAMING_STATE_EOF) { return !overflow; }
    }
}

"""+text[end:]
    text=replace(text, '        pb_istream_t stream = pb_istream_for_rx_ring_buf();', """        uint8_t frame[EDGE_RPC_FRAME_CAPACITY];
        size_t frame_length;
        bool frame_valid = rpc_receive_frame(frame, &frame_length);
        pb_istream_t stream = pb_istream_from_buffer(frame, frame_length);""")
    text=replace(text, 'bool status = pb_decode(&stream, &zmk_studio_Request_msg, &req);', 'bool status = frame_valid && pb_decode(&stream, &zmk_studio_Request_msg, &req);')
    text=replace(text, '\n        rpc_framing_state = FRAMING_STATE_IDLE;', '\n#if IS_ENABLED(CONFIG_LOFREE_EDGE_STUDIO_IO_DIAGNOSTICS)\n        if (!status) { edge_studio_io_decode_error(frame_valid ? PB_GET_ERROR(&stream) : "frame overflow", rpc_framing_state); }\n#endif\n        rpc_framing_state = FRAMING_STATE_IDLE;')
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
