"""Derive export symbols from the same ZMK headers as the accepted firmware."""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
headers = ROOT / '.deps/zmk-tc32/app/include/dt-bindings/zmk'
constants = {}
usage_headers = (headers/'hid_usage.h').read_text() + '\n' + (headers/'hid_usage_pages.h').read_text()
for name, value in re.findall(r'^#define[ \t]+(\w+)[ \t]+\(?(0x[0-9a-fA-F]+|[0-9]+)\)?[ \t]*(?://[^\n]*)?$', usage_headers, re.M):
    constants[name] = int(value, 0)
symbols = {}
key_header = (headers/'keys.h').read_text().replace('\\\n', '')
for name, page, usage in re.findall(r'^#define\s+(\w+)\s+\(ZMK_HID_USAGE\((\w+),\s*(\w+)\)\)', key_header, re.M):
    if page in constants and usage in constants:
        symbols.setdefault(str((constants[page]<<16)|constants[usage]), name)
assert symbols[str(0x70004)] == 'A'
aliases = {}
for name, expression in re.findall(r'^#define[ \t]+(\w+)[ \t]+([^\n]+)', key_header, re.M):
    expression = expression.split('//')[0].strip()
    if 'ZMK_HID_USAGE' not in expression:
        aliases[name] = expression
out = '// Generated from pinned ZMK keys.h/hid_usage.h; MIT, ZMK Contributors.\n'
out += 'export const KEY_SYMBOLS = '+json.dumps(symbols, sort_keys=True)+';\n'
out += 'export const KEY_ALIASES = '+json.dumps(aliases, sort_keys=True)+';\n'
(ROOT/'web/dist/keymap-export-symbols.js').write_text(out)
print(f'Generated {len(symbols)} ZMK key symbols')
