"""Create matching website, firmware, source, notices and provenance; never touches hardware."""
import argparse,hashlib,json,os,re,shutil,subprocess,tarfile,zlib
from pathlib import Path
from verify_promotion import CASES
import markdown
from audit_publication import audit_source,audit_site,audit_archive,source_files,PRIVATE
ROOT=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def tar_files(path,files):
 with tarfile.open(path,'w:gz') as t:
  for p,name in files:t.add(p,arcname=name,recursive=False)
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--site-base',default='/lofree-edge-zmk');p.add_argument('--site-only',action='store_true');p.add_argument('--site-output',default='build/site');a=p.parse_args()
 base=a.site_base.rstrip('/')
 if base and not re.fullmatch(r'/[a-zA-Z0-9_-]+',base):raise SystemExit('Expected empty base or one project subdirectory')
 subprocess.run([str(ROOT/'.venv/bin/python'),str(ROOT/'tools/build_edge_firmware_ui.py'),'--base',base],cwd=ROOT,check=True)
 version=(ROOT/'VERSION').read_text().strip()
 if not re.fullmatch(r'0\.\d+\.\d+-alpha\.\d+',version):raise SystemExit('First-publication pipeline accepts 0.x alpha releases only; review stable-release policy before changing this')
 audit_source()
 image=ROOT/'firmware/build/lofree_edge-ble-studio/zephyr/zmk.ota.bin'
 data=image.read_bytes()
 build_info=json.loads((image.parents[1]/'build-info.json').read_text())
 if build_info['firmware_sha256']!=sha(image) or build_info['elf_sha256']!=sha(image.with_name('zmk.elf')) or build_info['version']!=version:raise SystemExit('Stale build provenance: rebuild the firmware')
 if json.loads((ROOT/'toolchain.lock.json').read_text())['llvm_version'] not in build_info['llvm']:raise SystemExit('The release compiler does not match the pinned toolchain')
 if data[8:12]!=b'KNLT' or int.from_bytes(data[24:28],'little')!=len(data) or len(data)>0x20000 or int.from_bytes(data[-4:],'little') != zlib.crc32(data[:-4])^0xffffffff:raise SystemExit('Firmware header/CRC/size check failed')
 # Prevent relabeling an old image with a new project version.
 if version.encode() not in data:raise SystemExit('Firmware does not contain the canonical version')
 site=(ROOT/a.site_output).resolve();
 if not site.is_relative_to(ROOT/'build'):raise SystemExit('Website output must stay in build/')
 release=ROOT/'build/release';site.mkdir(parents=True,exist_ok=True);release.mkdir(parents=True,exist_ok=True)
 for old in ([] if a.site_only else release.iterdir()):
  if old.is_file():old.unlink()
 for old in list(site.iterdir()):
  if old.is_dir():shutil.rmtree(old)
  else:old.unlink()
 for f in (ROOT/'web/dist').iterdir():
  if f.name in ['studio-qa','firmware-qa','firmware'] or 'qa.html' in f.name:continue
  if f.is_dir():shutil.copytree(f,site/f.name)
  else:shutil.copyfile(f,site/f.name)
 # Bundle only fresh production output. Vite root paths must match this artifact.
 studio=(site/'studio/index.html').read_text()
 if f'src="{base}/studio/assets/' not in studio:raise SystemExit('Rebuild Studio with EDGE_SITE_BASE='+base)
 (site/'version.json').write_text(json.dumps({'version':version})+'\n')
 (site/'.nojekyll').touch()
 stem='lofree-edge-zmk-'+version
 binary=stem.replace('.','-')+'.ota.bin' # Existing flasher accepts lowercase alnum/hyphen filenames.
 firmware=site/'firmware';firmware.mkdir()
 shutil.copyfile(image,firmware/binary)
 manifest={'format':'lofree-edge-browser-firmware-v1','version':version,'builds':[{'file':binary,'label':'ZMK '+version+' · Experimental BLE + USB Studio','version':version,'board':'lofree_edge','size':len(data),'sha256':sha(image)}]}
 (firmware/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 for name,doc in [('risk.html','RISK.md'),('roadmap.html','ROADMAP.md')]:
  text=markdown.markdown((ROOT/doc).read_text(),extensions=['tables'])
  text=text.replace('href="RISK.md"','href="risk.html"').replace('href="ROADMAP.md"','href="roadmap.html"')
  (site/name).write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lofree Edge ZMK — '+doc+'</title><link rel="stylesheet" href="edge-design.css"><body class="edge-suite"><edge-risk-notice></edge-risk-notice><main style="max-width:900px;margin:40px auto;padding:0 24px;line-height:1.8"><a href="./">Firmware</a> · <a href="studio/">Studio</a>'+text+'</main><script type="module" src="edge-shell.js"></script></body></html>')
 locks=json.loads((ROOT/'dependencies.lock.json').read_text());license_dir=site/'licenses';license_dir.mkdir()
 for name in locks:
  dep=ROOT/'.deps'/name
  for pattern in ['LICENSE*','NOTICE*','COPYING*']:
   for f in dep.glob(pattern):
    if f.is_file():shutil.copyfile(f,license_dir/(name+'-'+f.name))
 for notice in (ROOT/'licenses').glob('*'):
  if notice.is_file():shutil.copyfile(notice,license_dir/notice.name)
 for f in ['LICENSE','RISK.md','ATTRIBUTION.md','LICENSING.md','THIRD_PARTY_NOTICES.md']:shutil.copyfile(ROOT/f,license_dir/f)
 notices=[];modules=ROOT/'.deps/zmk-studio/node_modules'
 for package_path in json.loads((modules.parent/'package-lock.json').read_text())['packages']:
  if not package_path:continue
  package=modules.parent/package_path/'package.json'
  try:
   info=json.loads(package.read_text());name=info.get('name');license=info.get('license')
   if not license and name=='browser-assert' and (package.parent/'LICENSE').read_text().startswith('The MIT License'):license='MIT'
   if not name or not info.get('version'):continue
   repo=info.get('repository');link=repo.get('url') if isinstance(repo,dict) else repo
   target=license_dir/'npm'/(name.replace('/','--')+'-'+info['version']);target.mkdir(parents=True,exist_ok=True)
   for license_file in package.parent.iterdir():
    if license_file.is_file() and license_file.name.lower().startswith(('license','licence','notice','copying','copyright')):shutil.copyfile(license_file,target/license_file.name)
   notices.append({'name':name,'version':info['version'],'license':license or 'SEE INCLUDED LICENSE FILES','url':link or info.get('homepage') or 'https://www.npmjs.com/package/'+name})
  except (ValueError,OSError):continue
 import html
 rows=''.join('<tr><td><a href="https://www.npmjs.com/package/'+html.escape(n['name'])+'/v/'+html.escape(n['version'])+'">'+html.escape(n['name'])+'</a></td><td>'+html.escape(n['version'])+'</td><td>'+html.escape(str(n['license']))+'</td></tr>' for n in sorted(notices,key=lambda n:(n['name'],n['version'])))
 (site/'dependency-notices.html').write_text('<!doctype html><meta charset="utf-8"><title>Dependency notices</title><h1>Dependency notices</h1><p>Copyright/license texts are in the accompanying licenses directory and corresponding-source archive.</p><table><tr><th>Package / source link</th><th>Version</th><th>License</th></tr>'+rows+'</table>')
 (site/'dependency-notices.json').write_text(json.dumps(sorted(notices,key=lambda n:(n['name'],n['version'])),indent=2)+'\n')
 # Version every root module so native ESM imports cannot mix two releases.
 assets={f.name:f.stem+'.'+version.replace('.','-')+f.suffix for f in site.iterdir() if f.suffix in {'.js','.css'}}
 for f in site.rglob('*'):
  if f.is_file() and f.suffix in {'.html','.js','.css'}:
   text=f.read_text()
   for old,new in assets.items():text=text.replace(old,new)
   f.write_text(text)
 for old,new in assets.items():(site/old).rename(site/new)
 audit_site(site)
 if a.site_only:
  print('PASS: standalone website staged at '+str(site.relative_to(ROOT)));return
 shutil.copyfile(image,release/(stem+'.ota.bin'))
 shutil.copyfile(image.with_name('zmk.elf'),release/(stem+'.elf'))
 provenance={**build_info,'dirty':bool(subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip()),'dependencies':locks,'site_base':base,'hardware_validation_at_build':'pending; published release body records exact-SHA hardware evidence'}
 (release/'provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
 shutil.copyfile(site/'dependency-notices.json',release/'dependency-notices.json')
 files=[(p,str(p.relative_to(site))) for p in site.rglob('*') if p.is_file()]
 tar_files(release/(stem+'-website.tar.gz'),files)
 # Complete project and pinned upstream source; exclude foreign binaries and VCS/caches.
 source=[(p,'lofree-edge-zmk/'+str(rel)) for rel,p in source_files()]
 forbidden={'.exe','.dll','.bin','.elf','.o','.obj','.a','.so','.hex','.lib','.pyc','.zip','.7z','.gzf','.gpr','.log','.pem','.key','.p12','.pfx','.der'}
 for name,item in locks.items():
  dep=ROOT/'.deps'/name
  paths=subprocess.check_output(['git','ls-files','-z'],cwd=dep).decode().split('\0') if (dep/'.git').exists() else [str(p.relative_to(dep)) for p in dep.rglob('*') if p.is_file() and '.git' not in p.parts]
  for rel in paths:
   f=dep/rel
   if not rel or not f.is_file() or f.is_symlink() or f.suffix.lower() in forbidden or 'checks/telink/' in rel:continue
   if PRIVATE.search(f.read_bytes()):continue # Unrelated upstream sample keys/docs; never required for this target.
   source.append((f,'lofree-edge-zmk/.deps/'+name+'/'+rel))
  marker=ROOT/'build/tmp'/(name+'-revision');marker.write_text(item['revision']+'\n');source.append((marker,'lofree-edge-zmk/.deps/'+name+'/.source-revision'))
 # Source as distributed by npm for every bundled JS library, with license files.
 allowed={'.js','.mjs','.cjs','.ts','.tsx','.json','.map','.css','.md','.txt','.html','.svg','.yaml','.yml'}
 for f in modules.rglob('*'):
  if f.is_file() and not f.is_symlink() and not PRIVATE.search(f.read_bytes()) and (f.suffix.lower() in allowed or f.name.upper().startswith(('LICENSE','NOTICE','COPYING'))):source.append((f,'lofree-edge-zmk/.deps/zmk-studio/node_modules/'+str(f.relative_to(modules))))
 tar_files(release/(stem+'-source.tar.gz'),source)
 # Audit before publishing; license/source review is also a human release gate.
 for f in release.glob('*.tar.gz'):audit_archive(f)
 notes=f'''# Lofree Edge ZMK {version}\n\n> EXPERIMENTAL — USE ENTIRELY AT YOUR OWN RISK. Firmware, website, tools and instructions may make your keyboard unusable, erase settings or interrupt input. Recovery may require a programmer and may fail. No warranty. Backups and retained stock are not guarantees.\n\nIndependent project; no vendor endorsement. Substantial AI assistance; see AI_DISCLOSURE.md in the source archive.\n\nBLE+USB Studio; three total layers. USB required for editing/flashing. The physical selector controls USB/Studio (ON), Bluetooth with USB power only (BT), and inactive input/radio/lighting/data (OFF). Moving it restarts firmware; save edits first. Three Bluetooth profiles remain. Configurable idle dim/off and Bluetooth sleep are experimental; physical deep wake and current measurements require the checklist below. Measured battery reporting remains unfinished.\n\nFirmware SHA-256: `{sha(image)}`\n\n## Exact-artifact hardware checklist\n\n'''
 for case in CASES:notes+='- [ ] hardware:'+case+'\n'
 notes+='\nDo not publish until every required hardware check is recorded against this exact SHA. Emulation is not a substitute.\n'
 (release/'RELEASE_NOTES.md').write_text(notes)
 (release/'SHA256SUMS').write_text(''.join(sha(f)+'  '+f.name+'\n' for f in sorted(release.iterdir()) if f.is_file() and f.name not in {'SHA256SUMS','RELEASE_NOTES.md'}))
 print(json.dumps(provenance,indent=2))
if __name__=='__main__':main()
