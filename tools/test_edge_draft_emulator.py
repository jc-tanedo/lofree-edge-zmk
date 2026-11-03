"""Run the draft Save pipeline against compiled TC32 CDC/protobuf, offline only."""
import json
from pathlib import Path
import runpy
import subprocess
from google.protobuf.json_format import MessageToDict, ParseDict

ROOT=Path(__file__).resolve().parents[1]
# Existing harness boots accepted firmware, exercises USB/lighting/Studio,
# saves a three-layer map and verifies it after reset.
state=runpy.run_path(str(ROOT/'tools/test_edge_studio_emulator.py'))
rpc,pb=state['rpc'],state['pb']
bridge=subprocess.Popen(['node',str(ROOT/'web/tests/draft-native-bridge.mjs')],
                         stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1)
done=False
try:
    for line in bridge.stdout:
        item=json.loads(line)
        if 'rpc' in item:
            request=ParseDict(item['rpc'],pb.Request())
            response=rpc(request)
            bridge.stdin.write(json.dumps(MessageToDict(response,use_integers_for_enums=True,always_print_fields_with_no_presence=True))+'\n')
            bridge.stdin.flush()
        elif item.get('done'):
            done=True
            break
        elif 'error' in item:
            raise AssertionError(item['error'])
    bridge.stdin.close()
    assert bridge.wait(timeout=10)==0 and done
finally:
    if bridge.poll() is None:
        bridge.terminate()
        bridge.wait(timeout=10)
print('PASS: draft edits/Undo/Redo leave native map untouched; explicit Save applies reorder/rename/key/layer add/remove and persists/readbacks through compiled firmware')
