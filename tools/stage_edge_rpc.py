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
        k_mutex_unlock(&rpc_transport_mutex);
        return -EIO;
    }}'''
        text=replace(text,old,new)
    return text

def stage(out):
    (out/'edge_studio_rpc.c').write_text(source())
if __name__=='__main__':
    import sys
    stage(Path(sys.argv[1]))
