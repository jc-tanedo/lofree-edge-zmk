"""Generate immutable-action workflows from actions.lock.json."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];actions=json.loads((ROOT/'actions.lock.json').read_text())
def action(name):return 'actions/'+name+'@'+actions[name]['revision']
setup=f'''      - uses: {action('checkout')}
        with:
          fetch-depth: 0
      - uses: {action('setup-python')}
        with:
          python-version: '3.12.12'
      - uses: {action('setup-node')}
        with:
          node-version: '22.14.0'
      - name: System build tools
        run: sh tools/ci_prerequisites.sh
      - name: Free runner disk space
        run: sh tools/ci_cleanup.sh prepare
      - name: Public dependencies
        run: python3 tools/bootstrap.py
      - name: Pinned release compiler
        run: .venv/bin/python tools/install_toolchain.py
'''
ci='''name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
permissions:
  contents: read
jobs:
  validate:
    runs-on: [self-hosted, Linux, X64]
    steps:
'''+setup+'''      - name: Build, tests and publication audits
        run: sh tools/ci.sh
'''
release='''name: Draft release
on:
  push:
    tags: ['v*']
permissions:
  contents: read
jobs:
  release:
    permissions:
      contents: write
    runs-on: [self-hosted, Linux, X64]
    steps:
'''+setup+'''      - name: Verify version and main ancestry
        run: |
          test "$GITHUB_REF_NAME" = "v$(cat VERSION)"
          git merge-base --is-ancestor HEAD origin/main
      - name: Build and validate exact artifacts
        run: sh tools/ci.sh
      - name: Create draft only
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          gh release create "$GITHUB_REF_NAME" build/release/*.ota.bin build/release/*.elf build/release/*.tar.gz build/release/provenance.json build/release/dependency-notices.json build/release/SHA256SUMS --draft --prerelease --verify-tag --title "Lofree Edge ZMK $GITHUB_REF_NAME" --notes-file build/release/RELEASE_NOTES.md
'''
pages='''name: Publish released website
on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      tag:
        description: Existing published release tag
        required: true
permissions:
  contents: read
concurrency:
  group: github-pages
  cancel-in-progress: false
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    permissions:
      contents: read
      pages: write
      id-token: write
    runs-on: [self-hosted, Linux, X64]
    steps:
      - uses: '''+action('checkout')+'''
        with:
          ref: ${{ github.event.release.tag_name || inputs.tag }}
          fetch-depth: 0
      - name: System tools
        run: sh tools/ci_prerequisites.sh
      - name: Download existing release; never rebuild
        env:
          GH_TOKEN: ${{ github.token }}
          RELEASE_TAG: ${{ github.event.release.tag_name || inputs.tag }}
        run: |
          git merge-base --is-ancestor HEAD origin/main
          mkdir -p build/download build/deploy
          gh release download "$RELEASE_TAG" --dir build/download
          python3 tools/verify_promotion.py "$RELEASE_TAG"
          tar -xzf "build/download/lofree-edge-zmk-$(cat VERSION)-website.tar.gz" -C build/deploy
          python3 tools/audit_publication.py --site build/deploy
      - uses: '''+action('configure-pages')+'''
      - uses: '''+action('upload-pages-artifact')+'''
        with:
          path: build/deploy
      - name: Deploy exact released website
        id: deployment
        uses: '''+action('deploy-pages')+'''\n'''
cleanup='''      - name: Clean transient build storage
        if: ${{ always() }}
        run: sh tools/ci_cleanup.sh finish
'''
ci+=cleanup
release+=cleanup
pages+=cleanup.replace('build storage', 'deployment storage')
for name,s in [('ci.yml',ci),('release.yml',release),('pages.yml',pages)]:
 p=ROOT/'.github/workflows'/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
