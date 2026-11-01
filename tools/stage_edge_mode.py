# SPDX-License-Identifier: GPL-3.0-or-later
"""Stage reviewed Edge-only hooks from immutable upstream sources."""
import hashlib
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]

def replace(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError('Review Edge mode hook after upstream changed: ' + old[:80])
    return text.replace(old, new)

def replace_function(text, signature, body):
    if text.count(signature) != 1:
        raise RuntimeError('Review Edge function hook: ' + signature)
    start = text.index(signature)
    end = text.index('\n}', start) + 2
    return text[:start] + signature + '\n' + body + '\n}' + text[end:]

def patch_ble(text):
    text = replace(text, '#include "ble_internal.h"', '#include "ble_internal.h"\n#if IS_ENABLED(CONFIG_LOFREE_EDGE_MODE_SWITCH)\n#include "edge_mode.h"\n#endif')
    text = replace(text, '\tMODE_24G,\n};', '\tMODE_24G,\n\tMODE_OFF,\n};')
    text = replace(text, '#if defined(CONFIG_TLSR_BLE_MODE_FROM_POWER_IN)\n/*', '''#if IS_ENABLED(CONFIG_LOFREE_EDGE_MODE_SWITCH)
static enum mode_position read_mode_switch(void)
{
    enum edge_mode m = edge_mode_read();
    for (int i = 0; i < 2; i++) {
        k_busy_wait(10);
        if (edge_mode_read() != m) { return MODE_OFF; }
    }
    switch (m) {
    case EDGE_MODE_ON: return MODE_WIRED;
    case EDGE_MODE_BT: return MODE_BLE;
    default: return MODE_OFF;
    }
}
#elif defined(CONFIG_TLSR_BLE_MODE_FROM_POWER_IN)
/*''')
    text = replace(text, '\t\tble_bond_save_db_seen(); /* a database hash a link in progress has set */', '''#if IS_ENABLED(CONFIG_LOFREE_EDGE_MODE_SWITCH)
        edge_mode_prepare_restart();
#endif
\t\tble_bond_save_db_seen(); /* a database hash a link in progress has set */''')
    text = replace(text, '\tswitch_watch(mode);', '''#if IS_ENABLED(CONFIG_LOFREE_EDGE_MODE_SWITCH)
    edge_mode_settled(mode == MODE_WIRED ? EDGE_MODE_ON :
                      mode == MODE_BLE ? EDGE_MODE_BT : EDGE_MODE_OFF);
#endif
\tswitch_watch(mode);''')
    return text

def read(relative, digest):
    data = (ROOT / '.deps/zmk-tc32' / relative).read_bytes()
    if hashlib.sha256(data).hexdigest() != digest:
        raise RuntimeError('Review Edge endpoint source against pinned upstream')
    return data.decode()

def stage_endpoints(out):
    text = read('app/src/endpoints.c', 'd3bde18478621d21dc6898a7eb2c864e7d8a5e0cd97cd890e5f2c397cdb169bb')
    text = replace(text, '#include <zmk/event_manager.h>', '#include <zmk/event_manager.h>\n#include "edge_mode.h"')
    text = replace_function(text, 'static enum zmk_transport get_selected_transport(void) {', '''
    /* Board policy is authoritative, including NONE while its selected
     * transport is unavailable. Never fall back onto the other host.
     */
    switch (edge_mode_current()) {
    case EDGE_MODE_ON: return is_usb_ready() ? ZMK_TRANSPORT_USB : ZMK_TRANSPORT_NONE;
    case EDGE_MODE_BT: return is_ble_ready() ? ZMK_TRANSPORT_BLE : ZMK_TRANSPORT_NONE;
    default: return ZMK_TRANSPORT_NONE;
    }
''')
    text = replace_function(text, 'int zmk_endpoint_set_preferred_transport(enum zmk_transport transport) {', '''
    /* Keep legacy bindings resolvable, but never persist a key's attempt to
     * override the physical selector (including OUT_NONE and OUT_TOG).
     */
    ARG_UNUSED(transport);
    return 0;
''')
    text = replace(text, 'enum zmk_transport zmk_endpoint_get_preferred_transport(void) { return preferred_transport; }', '''enum zmk_transport zmk_endpoint_get_preferred_transport(void) {
    switch (edge_mode_current()) {
    case EDGE_MODE_ON: return ZMK_TRANSPORT_USB;
    case EDGE_MODE_BT: return ZMK_TRANSPORT_BLE;
    default: return ZMK_TRANSPORT_NONE;
    }
}''')
    text = replace(text, 'return get_instance_from_transport(preferred_transport);', 'return get_instance_from_transport(zmk_endpoint_get_preferred_transport());')
    (out / 'edge_endpoints.c').write_text(text)

if __name__ == '__main__':
    stage_endpoints(Path(sys.argv[1]))
