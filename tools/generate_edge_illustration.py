"""Original SVG illustration from our verified Edge84 geometry, no vendor assets."""
from pathlib import Path
import json
from html import escape
root=Path(__file__).resolve().parents[1]
keys=json.loads((root/'web/dist/edge-info.json').read_text())['layouts']['LAYOUT']['layout']
parts=['''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 340" role="img" aria-labelledby="title desc">
<title id="title">Lofree Edge, illustrated</title><desc id="desc">An original drawing of the Edge's 84-key layout, broad carbon-fiber lower border, dark low-profile caps and orange Enter legend.</desc>
<defs><linearGradient id="cap" x2="0" y2="1"><stop stop-color="#383a3b"/><stop offset="1" stop-color="#252728"/></linearGradient>
<pattern id="carbon" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#141617"/><path d="M-5 5L5-5M0 10L10 0M5 15L15 5" stroke="#3c3e3f" stroke-width="3"/></pattern>
<filter id="shadow" x="-20%" y="-30%" width="140%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#1f2025" flood-opacity=".12"/></filter></defs>
<g transform="translate(52 42) rotate(-5 258 125)" filter="url(#shadow)">
<rect x="0" y="2" width="516" height="250" rx="13" fill="#151718"/>
<rect width="516" height="250" rx="13" fill="url(#carbon)" stroke="#484a4a" stroke-width="1.3"/>
<rect x="9" y="15" width="498" height="194" rx="5" fill="#111314"/>
<g transform="translate(13 19) scale(1.16)">''']
labels={'BackSpace':'BACKSPACE','Left Shift':'SHIFT','Right Shift':'SHIFT','Left Ctrl':'CTRL','Right Ctrl':'CTRL','Left Alt':'ALT','Right Alt':'ALT','Left Win':'WIN','PrintScreen':'PRTSC','PageUp':'PGUP','PageDown':'PGDN','CapsLock':'CAPS','Space':'','Enter':'ENTER','Up':'↑','Down':'↓','Left':'←','Right':'→','Delete':'DEL','Insert':'INS'}
# info.json is normalized from the recovered geometry, not generated placeholder rows.
for k in keys:
    x,y,w,h=(k['x']*26,k['y']*26,k.get('w',1)*26,k.get('h',1)*26)
    label=labels.get(k['label'],k['label']).upper();color='#dca35f' if k['label']=='Enter' else '#979b99'
    tx = x+w/2 if k['label']=='Enter' else x+5
    anchor = 'middle' if k['label']=='Enter' else 'start'
    parts.append(f'<g><rect x="{x+1.8:.2f}" y="{y+2.2:.2f}" width="{w-3.6:.2f}" height="{h-3.8:.2f}" rx="3" fill="#17191b"/><rect x="{x+1.8:.2f}" y="{y:.2f}" width="{w-3.6:.2f}" height="{h-4:.2f}" rx="3" fill="url(#cap)" stroke="#46494a" stroke-width=".4"/><text x="{tx:.2f}" y="{y+8:.2f}" text-anchor="{anchor}" font-family="Arial,sans-serif" font-size="4.5" letter-spacing=".25" fill="{color}">{escape(label)}</text></g>')
parts.append('</g></g></svg>')
(root/'web/dist/assets/edge-illustration.svg').write_text('\n'.join(parts))
print(f'Original illustration: {len(keys)} keys')
