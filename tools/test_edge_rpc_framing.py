# SPDX-License-Identifier: GPL-3.0-or-later
"""Compile the actual upstream response writer at a bounded host transport seam."""
from pathlib import Path
import subprocess,sys
from stage_edge_rpc import source as patched_source
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'.deps/zmk-tc32/app/src/studio/rpc.c').read_text() if '--upstream' in sys.argv else patched_source()
a=source.index('RING_BUF_DECLARE(rpc_tx_buf,')
b=source.index('\nstatic void rpc_main(',a)
body=source[a:b]
fixture=(ROOT/'tests/fixtures/studio_tx_harness.c').read_text()
out=ROOT/'build/tmp/rpc-framing';out.mkdir(parents=True,exist_ok=True)
(out/'test.c').write_text(fixture.replace('// INSERT_RESPONSE_FUNCTIONS',body))
subprocess.run(['cc','-std=c11','-w',str(out/'test.c'),'-o',str(out/'test')],check=True)
subprocess.run([str(out/'test')],check=True)
