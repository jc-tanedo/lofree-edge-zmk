"""Build isolated React Firmware/Studio QA. Never expose this as a release."""
import argparse,os,shutil,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--site',default='build/site');p.add_argument('--base',default='/lofree-edge-zmk');a=p.parse_args();base=a.base.rstrip('/')
subprocess.run([sys.executable,str(ROOT/'tools/check_website.py'),'--site',str(ROOT/a.site),'--base',base],cwd=ROOT,check=True)
subprocess.run([sys.executable,str(ROOT/'tools/build_edge_firmware_ui.py'),'--preview','--base',base],cwd=ROOT,check=True)
subprocess.run([sys.executable,str(ROOT/'tools/build_edge_studio_preview.py')],cwd=ROOT,env={**os.environ,'EDGE_SITE_BASE':base},check=True)
parent=ROOT/'build/qa-site';out=parent/base.lstrip('/') if base else parent
if out.exists():shutil.rmtree(out)
shutil.copytree(ROOT/a.site,out)
for name in ['firmware-qa','studio-qa']:shutil.copytree(ROOT/'web/dist'/name,out/name)
shutil.copyfile(ROOT/'web/dist/firmware-qa/index.html',out/'index.html')
print('Hardware-free QA root:',parent)
