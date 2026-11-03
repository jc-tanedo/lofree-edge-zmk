"""Inject site-root shared assets after Vite, avoiding its public-path rewriting."""
import argparse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--directory',default='web/dist/studio');p.add_argument('--base',default='');a=p.parse_args();base=a.base.rstrip('/')
page=ROOT/a.directory/'index.html';text=page.read_text();assets=f'<link rel="stylesheet" href="{base}/edge-design.css?v=8"><script type="module" src="{base}/edge-shell.js?v=5"></script>'
text=text.replace('</title>','</title>'+assets,1);page.write_text(text)
