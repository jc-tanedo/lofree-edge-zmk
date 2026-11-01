"""Audit the curated source, Git history, archives and hosted output (offline)."""
import argparse,json,re,subprocess,tarfile,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BANNED={'.exe','.dll','.sys','.asar','.7z','.gpr','.gzf','.pcap','.pcapng','.pyc','.log','.db'}
PRIVATE=re.compile(rb'(?:/mnt/repo/rea/lo[f]ree|/home/jcae[z]ar|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=]{20,}[\r\n]|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})')
EXCLUDED={'.git','.deps','.venv','build','__pycache__','node_modules'}
def check(name,data,kind='source'):
 p=Path(name)
 if p.is_absolute() or '..' in p.parts:raise ValueError('Unsafe path: '+name)
 if any(part in {'private','analysis'} for part in p.parts):raise ValueError('Private path: '+name)
 if p.suffix.lower() in BANNED:raise ValueError('Excluded payload: '+name)
 if kind=='source' and (p.suffix.lower() in {'.bin','.elf','.o','.obj','.a','.so','.hex','.lib'} or len(data)>5_000_000):raise ValueError('Unexpected binary/large source file: '+name)
 if PRIVATE.search(data):raise ValueError('Private identifier/credential in '+name)
 if data.startswith(b'MZ'):raise ValueError('PE executable in '+name)
 if kind=='site' and ('studio-qa' in p.parts or 'node_modules' in p.parts or p.name.endswith('qa.html')):raise ValueError('QA/dependency files in website: '+name)
def source_files():
 for p in ROOT.rglob('*'):
  rel=p.relative_to(ROOT)
  if any(x in EXCLUDED for x in rel.parts) or rel.parts[:2]==('firmware','build') or rel.parts[:3] in [('web','dist','studio'),('web','dist','studio-qa'),('web','dist','firmware')]:continue
  if p.is_symlink():raise ValueError('Source symlink: '+str(rel))
  if p.is_file():yield rel,p

def audit_source():
 files=list(source_files())
 for rel,p in files:check(str(rel),p.read_bytes())
 # Check every committed historical blob, not only the current checkout.
 if (ROOT/'.git').is_dir():
  listing=subprocess.check_output(['git','rev-list','--objects','--all'],cwd=ROOT,text=True)
  for line in listing.splitlines():
   sha,_,name=line.partition(' ')
   if not name:continue
   if subprocess.check_output(['git','cat-file','-t',sha],cwd=ROOT,text=True).strip()=='blob':check(name,subprocess.check_output(['git','cat-file','blob',sha],cwd=ROOT))
 return len(files)
def audit_site(directory):
 for p in directory.rglob('*'):
  if p.is_symlink():raise ValueError('Website symlink')
  if p.is_file():check(str(p.relative_to(directory)),p.read_bytes(),'site')
 manifest=json.loads((directory/'firmware/manifest.json').read_text())
 for item in manifest['builds']:
  import hashlib
  data=(directory/'firmware'/item['file']).read_bytes()
  if hashlib.sha256(data).hexdigest()!=item['sha256']:raise ValueError('Catalog hash mismatch')
 if '<edge-risk-notice>' not in (directory/'index.html').read_text() or '<edge-risk-notice>' not in (directory/'studio/index.html').read_text():raise ValueError('Missing persistent risk notice')
def audit_archive(path):
 if path.suffix=='.zip':
  with zipfile.ZipFile(path) as z:
   for name in z.namelist():
    if not name.endswith('/'):check(name,z.read(name),'archive')
 else:
  with tarfile.open(path,'r:*') as t:
   for m in t:
    if m.issym() or m.islnk():raise ValueError('Archive link: '+m.name)
    if m.isfile():check(m.name,t.extractfile(m).read(),'archive')
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--site',type=Path);p.add_argument('--archive',type=Path,action='append',default=[]);a=p.parse_args()
 count=audit_source()
 if a.site:audit_site(a.site)
 for archive in a.archive:audit_archive(archive)
 print(f'PASS: {count} curated source files; Git history, requested archives/site audited')
