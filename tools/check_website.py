"""Check every local HTML asset/navigation target in the packaged site."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,unquote
import argparse
class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  for key,value in attrs:
   if key in ('href','src') and value:self.links.append(value)
def validate(site,base):
 count=0
 for p in site.rglob('*.html'):
  parser=Links();parser.feed(p.read_text())
  for link in parser.links:
   u=urlsplit(link)
   if u.scheme or u.netloc or not u.path:continue
   path=unquote(u.path)
   if path.startswith('/'):
    if not path.startswith(base+'/'):raise ValueError('Asset escaped project base: '+link)
    target=site/path[len(base)+1:]
   else:target=p.parent/path
   if target.is_dir():target=target/'index.html'
   if not target.is_file():raise ValueError('Missing local target '+str(target.relative_to(site))+' in '+str(p.relative_to(site)))
   count+=1
 print(f'PASS: {count} local asset/navigation targets, base={base or "/"}')
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--site',type=Path,default=Path('build/site'));p.add_argument('--base',default='/lofree-edge-zmk');a=p.parse_args();validate(a.site,a.base)
