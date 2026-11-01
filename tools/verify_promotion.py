"""Verify exact release assets and hardware evidence before Pages deployment."""
import hashlib,json,re,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CASES=['typing','usb','ble-pair-reconnect','layers-save-power-cycle','fn-media','caps-on-off','backlight','trial-acceptance','retained-image-return']
def validate_metadata(version,tag,release,provenance,commit):
 if release['isDraft']:raise ValueError('Draft release cannot deploy')
 if tag!='v'+version or provenance['version']!=version:raise ValueError('Version/tag mismatch')
 if provenance['site_base']!='/lofree-edge-zmk':raise ValueError('Wrong website base')
 if provenance['commit']!=commit:raise ValueError('Provenance does not match tag commit')
 body=release['body']
 if provenance['firmware_sha256'] not in body:raise ValueError('Checklist does not identify this firmware SHA')
 for case in CASES:
  if not re.search(r'^- \[[xX]\] hardware:'+re.escape(case)+r'\s*$',body,re.M):raise ValueError('Missing hardware check: '+case)
def verify_assets(directory,provenance):
 version=provenance['version'];expected='lofree-edge-zmk-'+version+'.ota.bin'
 entries={}
 for line in (directory/'SHA256SUMS').read_text().splitlines():
  digest,name=line.split('  ',1);p=directory/name
  if p.parent!=directory or not p.is_file() or p.is_symlink():raise ValueError('Missing/unsafe release asset')
  if hashlib.file_digest(p.open('rb'),'sha256').hexdigest()!=digest:raise ValueError('Asset checksum mismatch: '+name)
  entries[name]=digest
 for name in [expected,'lofree-edge-zmk-'+version+'-website.tar.gz','lofree-edge-zmk-'+version+'-source.tar.gz','provenance.json']:
  if name not in entries:raise ValueError('Required asset not checksummed: '+name)
 if entries[expected]!=provenance['firmware_sha256']:raise ValueError('Wrong firmware artifact')
def main():
 tag=sys.argv[1];directory=Path('build/download')
 release=json.loads(subprocess.check_output(['gh','release','view',tag,'--json','body,isDraft,tagName,targetCommitish'],text=True))
 provenance=json.loads((directory/'provenance.json').read_text());version=(ROOT/'VERSION').read_text().strip()
 commit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
 validate_metadata(version,tag,release,provenance,commit);verify_assets(directory,provenance)
 if json.loads((ROOT/'toolchain.lock.json').read_text())['llvm_version'] not in provenance['llvm']:raise ValueError('Release compiler differs from toolchain lock')
 print('PASS: exact assets and all hardware checklist markers verified')
if __name__=='__main__':main()
