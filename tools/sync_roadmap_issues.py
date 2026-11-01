"""Review roadmap issue payloads by default; --apply creates missing public tracking issues."""
import argparse,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--apply',action='store_true');a=p.parse_args()
items=json.loads((ROOT/'roadmap.json').read_text())
repo='jc-tanedo/lofree-edge-zmk'
milestones={}
if a.apply:
 current=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/milestones?state=all&per_page=100'],text=True))
 milestones={item['title']:item['number'] for item in current}
 for name in dict.fromkeys(item['milestone'] for item in items if item['status']!='completed'):
  if name not in milestones:
   created=json.loads(subprocess.check_output(['gh','api','--method','POST',f'repos/{repo}/milestones','-f','title='+name],text=True));milestones[name]=created['number']
 for status in set(item['status'] for item in items):
  subprocess.run(['gh','label','create','status:'+status.replace(' ','-'),'--repo',repo,'--color','8D6B53','--description','Roadmap status: '+status,'--force'],check=True)
for item in items:
 if item['status']=='completed' or item.get('issue'):continue
 title='Roadmap: '+item['title'];body=f"Status: {item['status']}\nMilestone: {item['milestone']}\n\n{item['limitation']}\n\nAcceptance:\n{item['acceptance']}\n\nNo delivery date is promised. Experimental project, used entirely at the user's own risk."
 if not a.apply:print(json.dumps({'title':title,'body':body}));continue
 # Exact title lookup makes interrupted syncs idempotent.
 existing=json.loads(subprocess.check_output(['gh','issue','list','--repo','jc-tanedo/lofree-edge-zmk','--state','all','--search',title,'--json','title,url'],text=True))
 match=next((issue for issue in existing if issue['title']==title),None)
 if match:item['issue']=match['url']
 else:
  temp=ROOT/'build/tmp/roadmap-issue.md';temp.parent.mkdir(parents=True,exist_ok=True);temp.write_text(body)
  item['issue']=subprocess.check_output(['gh','issue','create','--repo','jc-tanedo/lofree-edge-zmk','--title',title,'--body-file',str(temp)],text=True).strip()
 subprocess.run(['gh','issue','edit',item['issue'],'--repo',repo,'--add-label','status:'+item['status'].replace(' ','-'),'--milestone',item['milestone']],check=True)
 (ROOT/'roadmap.json').write_text(json.dumps(items,indent=2)+'\n')
if a.apply:subprocess.run(['python3',str(ROOT/'tools/render_roadmap.py')],check=True)
