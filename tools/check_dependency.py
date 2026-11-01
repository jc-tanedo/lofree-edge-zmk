"""Verify a checkout or the revision marker in a corresponding-source archive."""
import json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
name=sys.argv[1];path=ROOT/'.deps'/name;wanted=json.loads((ROOT/'dependencies.lock.json').read_text())[name]['revision']
if (path/'.git').exists():actual=subprocess.check_output(['git','-C',str(path),'rev-parse','HEAD'],text=True).strip()
else:actual=(path/'.source-revision').read_text().strip()
if actual!=wanted:raise SystemExit('Unexpected source revision: '+name)
