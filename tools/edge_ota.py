"""Experimental Edge diagnostics/acceptance. USE ENTIRELY AT YOUR OWN RISK.

No flashing or overwrite-unlock commands are exposed. Confirm runs the upstream
flash self-test (which writes the bond log) and marks the trial accepted.
"""
import argparse,importlib.util,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'.deps/zmk-tc32/tc32/scripts/telink_ota.py'
spec=importlib.util.spec_from_file_location('edge_upstream_ota',path)
ota=importlib.util.module_from_spec(spec);sys.modules[spec.name]=ota;spec.loader.exec_module(ota)
ota.MODELS['Lofree Edge']=('EDGE84@Lofree','Lofree Edge ZMK')
def main():
 p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(dest='command',required=True)
 check=sub.add_parser('check',help='Offline image validation');check.add_argument('image')
 sub.add_parser('info',help='Read ZMK trial information over USB')
 confirm=sub.add_parser('confirm',help='Writes flash self-test and accepts trial: entirely at your own risk');confirm.add_argument('--accept-risk',action='store_true')
 a=p.parse_args()
 if a.command=='check':return ota.main(['check',a.image])
 if a.command=='confirm' and not a.accept_risk:p.error('Confirm writes flash and disables trial rollback. Read RISK.md; --accept-risk is required each time.')
 print('EXPERIMENTAL — firmware, website, tools and instructions are used entirely at your own risk. No warranty. Recovery may fail.',file=sys.stderr)
 ota.main([a.command,'--vid','1d50','--pid','615e','--product','Lofree Edge ZMK','--timeout','3000','--retries','1'])
if __name__=='__main__':main()
