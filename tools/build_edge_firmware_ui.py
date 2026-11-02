"""Build the React Firmware workspace from Studio's pinned frontend toolchain."""
from pathlib import Path
import argparse,re,shutil,subprocess
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--base',default='');p.add_argument('--preview',action='store_true');a=p.parse_args();base=a.base.rstrip('/')
if base and not re.fullmatch(r'/[a-zA-Z0-9_-]+',base):raise SystemExit('Expected empty base or one project subdirectory')
subprocess.run([str(ROOT/'.venv/bin/python'),str(ROOT/'tools/check_dependency.py'),'zmk-studio'],check=True)
stage=ROOT/'build/tmp/firmware-react';app=stage/'app'
if app.exists():shutil.rmtree(app)
shutil.copytree(ROOT/'web/firmware',app)
modules=stage/'node_modules'
if not modules.exists():modules.symlink_to(ROOT/'.deps/zmk-studio/node_modules',target_is_directory=True)
(stage/'dist').mkdir(exist_ok=True)
for name in ['webhid.js','firmware.js','firmware-session.js','protocol.js','profile.js','keymap.js','layout.js']:
 shutil.copyfile(ROOT/'web/dist'/name,stage/'dist'/name)
if a.preview:
 shutil.copyfile(app/'preview.jsx',app/'main.jsx')
(app/'vite.config.mjs').write_text('export default {publicDir:false,build:{target:"es2020"}};\n')
name='firmware-qa' if a.preview else 'firmware-ui'
out=ROOT/'web/dist'/name
subprocess.run([str(modules/'.bin/vite'),'build','--base='+base+'/'+name+'/','--outDir='+str(out),'--emptyOutDir'],cwd=app,check=True)
text=(out/'index.html').read_text()
prefix=base+'/' if base else './'
assets=f'<link rel="stylesheet" href="{prefix}style.css?v=5"><link rel="stylesheet" href="{prefix}edge-design.css?v=8"><script type="module" src="{prefix}edge-shell.js?v=5"></script><script defer src="{prefix}bootstrap.js"></script>'
text=text.replace('</title>','</title>'+assets)
if a.preview:(out/'index.html').write_text(text)
else:
 (ROOT/'web/dist/index.html').write_text(text)
 (out/'index.html').unlink()
print('Built React Firmware workspace using pinned Studio dependencies')
