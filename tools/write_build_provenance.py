"""Record the compiler and hashes of this build, rather than the packaging shell."""
import hashlib,json,os,re,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];build=Path(sys.argv[1]);cache=(build/'CMakeCache.txt').read_text()
compiler=re.search(r'^CMAKE_C_COMPILER:[^=]+=(.+)$',cache,re.M).group(1)
info={'version':(ROOT/'VERSION').read_text().strip(),'llvm':subprocess.check_output([compiler,'--version'],text=True).splitlines()[0],
 'firmware_sha256':hashlib.file_digest((build/'zephyr/zmk.ota.bin').open('rb'),'sha256').hexdigest(),
 'elf_sha256':hashlib.file_digest((build/'zephyr/zmk.elf').open('rb'),'sha256').hexdigest(),
 'source_date_epoch':os.environ.get('SOURCE_DATE_EPOCH','0')}
try:info['commit']=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,stderr=subprocess.DEVNULL,text=True).strip()
except subprocess.CalledProcessError:info['commit']='uncommitted-preparation'
(build/'build-info.json').write_text(json.dumps(info,indent=2)+'\n')
