"""Fetch hash-pinned public sources. Optional cache is only a Git clone accelerator."""
import argparse,json,os,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--cache',type=Path);p.add_argument('--sources-only',action='store_true');args=p.parse_args()
for name,item in json.loads((ROOT/'dependencies.lock.json').read_text()).items():
 dst=ROOT/'.deps'/name
 if not dst.exists():
  dst.parent.mkdir(exist_ok=True)
  cached=args.cache/name if args.cache else None
  subprocess.run(['git','clone','--no-hardlinks',str(cached) if cached and cached.exists() else item['url'],str(dst)],check=True)
  subprocess.run(['git','-C',str(dst),'remote','set-url','origin',item['url']],check=True)
 if not (dst/'.git').exists() and (dst/'.source-revision').exists():
  if (dst/'.source-revision').read_text().strip()!=item['revision']:raise SystemExit('Wrong archived source revision: '+name)
  continue
 if subprocess.run(['git','-C',str(dst),'cat-file','-e',item['revision']+'^{commit}']).returncode:
  subprocess.run(['git','-C',str(dst),'fetch','origin',item['revision']],check=True)
 subprocess.run(['git','-C',str(dst),'checkout','--detach',item['revision']],check=True)
 if subprocess.check_output(['git','-C',str(dst),'status','--porcelain','--untracked-files=no'],text=True).strip():raise SystemExit('Modified dependency: '+name)
for d in ['build/tmp','build/reports','firmware/build','web/dist/firmware']:(ROOT/d).mkdir(parents=True,exist_ok=True)
subprocess.run(['python3',str(ROOT/'tools/sync_version.py')],check=True)
if not args.sources_only:
 subprocess.run(['python3','-m','venv',str(ROOT/'.venv')],check=True)
 subprocess.run([str(ROOT/'.venv/bin/python'),'-m','pip','install','--cache-dir',str(ROOT/'build/tmp/pip-cache'),'-r',str(ROOT/'requirements-build.lock')],check=True)
 env={**os.environ,'npm_config_cache':str(ROOT/'build/tmp/npm-cache')}
 subprocess.run(['npm','ci','--prefix',str(ROOT/'.deps/zmk-studio')],env=env,check=True)
