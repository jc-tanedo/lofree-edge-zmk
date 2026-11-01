"""Derive Python metadata from the canonical project SemVer."""
import re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
v=(ROOT/'VERSION').read_text().strip()
if not re.fullmatch(r'\d+\.\d+\.\d+(?:-alpha\.\d+)?',v):raise SystemExit('Unsupported project version')
pep=re.sub(r'-alpha\.(\d+)',r'a\1',v)
p=ROOT/'pyproject.toml';p.write_text(re.sub(r'^version = ".*"',f'version = "{pep}"',p.read_text(),flags=re.M))
(ROOT/'src/lofree_edge/_version.py').write_text('# Generated from VERSION by tools/sync_version.py\n__version__ = '+repr(v)+'\n')
