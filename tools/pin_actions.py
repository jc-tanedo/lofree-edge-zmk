"""Resolve workflow action major tags to immutable commits; review changes before committing."""
import concurrent.futures,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
names={'checkout':'v4','setup-python':'v5','setup-node':'v4','upload-pages-artifact':'v3','deploy-pages':'v4','configure-pages':'v5'}
def resolve(pair):
 name,tag=pair;url='https://github.com/actions/'+name+'.git'
 text=subprocess.check_output(['git','ls-remote',url,'refs/tags/'+tag,'refs/tags/'+tag+'^{}'],text=True)
 lines=text.strip().splitlines();peeled=[line for line in lines if line.endswith('^{}')]
 sha=(peeled or lines)[0].split()[0]
 return name,{'revision':sha,'tag':tag,'url':url}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:result=dict(pool.map(resolve,names.items()))
(ROOT/'actions.lock.json').write_text(json.dumps(result,indent=2)+'\n')
