"""Stage disconnected/mock public UI QA, never a release artifact."""
import shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'build/qa-site'
shutil.copytree(ROOT/'build/site',out,dirs_exist_ok=True)
shutil.copytree(ROOT/'web/dist/studio-qa',out/'studio-qa',dirs_exist_ok=True)
shutil.copyfile(ROOT/'web/tests/firmware-preview.js',out/'qa-hid.js')
p=out/'index.html';p.write_text(p.read_text().replace('<head>','<head><script src="qa-hid.js"></script>'))
