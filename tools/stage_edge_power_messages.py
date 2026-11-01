# SPDX-License-Identifier: GPL-3.0-or-later
"""Stage an additive Edge extension; never edit the pinned upstream checkout."""
from pathlib import Path
import hashlib
import shutil
ROOT = Path(__file__).resolve().parents[1]

def stage():
    source = ROOT / '.deps/zmk-studio-messages'
    out = ROOT / 'build/generated/edge-studio-messages'
    shutil.copytree(source, out, dirs_exist_ok=True, ignore=shutil.ignore_patterns('.git'))
    p = out / 'proto/zmk/core.proto'
    original = p.read_text()
    expected = (ROOT / 'firmware/lofree_edge/power-core.sha256').read_text().strip()
    if hashlib.sha256(original.encode()).hexdigest() != expected:
        raise RuntimeError('Review power RPC against changed pinned core.proto')
    text = original.replace('        bool reset_settings = 4;', '''        bool reset_settings = 4;
        bool edge_get_power = 16;
        EdgePower edge_set_power = 17;''', 1)
    text = text.replace('message Response {\n    oneof response_type {', 'message Response {\n    oneof response_type {\n        EdgePower edge_power = 16;', 1)
    text += '''
// Project-specific, versioned extension. Seconds=0 means Never.
message EdgePower {
    uint32 schema = 1;
    uint32 dim_seconds = 2;
    uint32 off_seconds = 3;
    uint32 sleep_seconds = 4;
    uint32 dim_percent = 5;
    uint32 capabilities = 6;
    uint32 status = 7;
}
'''
    p.write_text(text)
    shutil.copyfile(ROOT / "firmware/lofree_edge/power-core.options",out / "proto/zmk/core.options")
    print(out)
if __name__ == '__main__': stage()
