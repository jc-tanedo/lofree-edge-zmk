"""Render the public roadmap from the single status/acceptance source."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
lines=['# Roadmap','','Experimental firmware and tools, used entirely at your own risk. [Risk notice](RISK.md).','','Statuses describe work, not promised delivery dates. The completed core-feature item records earlier evidence, not validation of a new release.','']
for item in json.loads((ROOT/'roadmap.json').read_text()):
 lines += ['## '+item['title'], '', '**'+item['status']+'** · '+item['milestone'], '', item['limitation'], '', '**Acceptance:** '+item['acceptance'], '', '[Tracking issue]('+item['issue']+')' if item.get('issue') else 'Tracking issue will be linked after the public repository is created.', '']
(ROOT/'ROADMAP.md').write_text('\n'.join(lines))
