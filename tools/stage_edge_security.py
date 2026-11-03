# SPDX-License-Identifier: GPL-3.0-or-later
"""Keep upstream locking, adding an Edge-owned persistent policy hook."""
from pathlib import Path
from stage_edge_mode import read, replace

def stage(out):
    text=read('app/src/studio/core.c','73337b1002d6da70767cf39f82c9adf2e8faf7115815b54d24c1d5284080712b')
    text=replace(text,'#include <zmk/studio/core.h>', '#include <zmk/studio/core.h>\n#include "edge_security.h"')
    text=replace(text,'{ return state; }', '{ return edge_security_requires_unlock() ? state : ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED; }')
    text=replace(text,'    if (state == new_state) {', '''    if (!edge_security_requires_unlock()) {
        new_state = ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED;
    }
    if (state == new_state) {''')
    (out/'edge_studio_core.c').write_text(text)

if __name__=='__main__':
    import sys
    stage(Path(sys.argv[1]))
