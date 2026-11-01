"""Install the exact official LLVM release into ignored build storage."""
import hashlib,json,os,subprocess,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];lock=json.loads((ROOT/'toolchain.lock.json').read_text());out=ROOT/'build/toolchain23';out.mkdir(parents=True,exist_ok=True)
archive=out/'llvm-download.tar.zst'
if not archive.exists() or hashlib.file_digest(archive.open('rb'),'sha256').hexdigest()!=lock['sha256']:
 urllib.request.urlretrieve(lock['url'],archive)
 if hashlib.file_digest(archive.open('rb'),'sha256').hexdigest()!=lock['sha256']:raise SystemExit('LLVM archive checksum mismatch')
subprocess.run(['tar','-I','zstd -d --long=31','-xf',str(archive),'-C',str(out),'--strip-components=1'],check=True)
version=subprocess.check_output([str(out/'bin/clang'),'--version'],text=True).splitlines()[0]
if lock['llvm_version'] not in version:raise SystemExit('Unexpected LLVM version')
print(version)
if os.environ.get('GITHUB_ENV'):
 with open(os.environ['GITHUB_ENV'],'a') as env:env.write('LLVM_TOOLCHAIN_PATH='+str(out)+'\n')
