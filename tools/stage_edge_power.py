# SPDX-License-Identifier: GPL-3.0-or-later
"""Reviewed native sleep hooks, derived from hash-pinned upstream."""
from pathlib import Path
from stage_edge_mode import read, replace

def stage(out):
    text=read('tc32/src/ble/ble_sleep.c','bfda06cf5ce840deb2322636f9fbc06d8d0fee3a5e2fd4ae4f1e916535c0caf2')
    text=replace(text,'#include "ble_internal.h"','#include "ble_internal.h"\n#include "edge_power.h"')
    text=replace(text,'want = link_ready && now - last_active >= CONFIG_TLSR_BLE_IDLE_S * 1000U;',
                 'want = link_ready && edge_power_sleep_due();')
    text=replace(text,'\t\tlast_active = now;\n\t}\n}', '\t\tlast_active = now;\n        edge_power_woke();\n\t}\n}')
    text=replace(text,'\t\tpad_woke = false;\n\t\tlast_active = now;',
                 '\t\tpad_woke = false;\n\t\tlast_active = now;\n        edge_power_woke();')
    import re
    base = Path(__file__).resolve().parents[1]/'.deps/zmk-tc32/tc32/src/ble'
    text=re.sub(r'#include "([^"\n]+)"',lambda m: '#include "'+str(base/m[1])+'"' if (base/m[1]).exists() else m[0],text)
    text=replace(text,'\t\tkey_matrix_sleep(true);','\t\tkey_matrix_sleep(true);\n        if (!edge_power_scan_asleep()) { low=false; return; }')
    (out/'edge_ble_sleep.c').write_text(text)

def patch_ble(text):
    text=replace(text,'#include "edge_mode.h"','#include "edge_mode.h"\n#include "edge_power.h"')
    start=text.index('\tint64_t now = k_uptime_get();',text.index('static bool adv_on(void)'))
    end=text.index('\tble_deep_sleep();',start)
    text=text[:start]+'''    /* Discoverable pairing gets at least 60 s, even with a short user timer.
     * Physical activity extends the configured timeout. BT ignores VBUS. */
    if (!edge_power_sleep_due() || (adv_pairing && k_uptime_get()-adv_since < 60000)) {
        return true;
    }
'''+text[end:]
    return text

if __name__=='__main__':
    import sys
    stage(Path(sys.argv[1]))
