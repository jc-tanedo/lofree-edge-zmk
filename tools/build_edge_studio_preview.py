"""Build isolated browser QA; no transport can access hardware. Run production build first."""
from pathlib import Path
import shutil,subprocess,re,os
ROOT=Path(__file__).resolve().parents[1]
os.environ['TMPDIR']=str(ROOT/'build/tmp')
os.environ['npm_config_cache']=str(ROOT/'build/tmp/npm-cache')
source=ROOT/'build/tmp/studio-ui-edge'
stage=ROOT/'build/tmp/studio-ui-preview'
shutil.copytree(source,stage,dirs_exist_ok=True,ignore=shutil.ignore_patterns('node_modules','dist'))
if not (stage/'node_modules').exists():
    (stage/'node_modules').symlink_to(ROOT/'.deps/zmk-studio/node_modules',target_is_directory=True)
shutil.copyfile(ROOT/'web/tests/studio-preview.tsx',stage/'src/EdgePreview.tsx')
shutil.copyfile(ROOT/'web/tests/fixtures/edge-compiled-keymap.json',stage/'src/preview-keymap.json')
p=stage/'src/App.tsx';s=p.read_text().replace('import { create_rpc_connection } from "@zmkfirmware/zmk-studio-ts-client";','import { create_rpc_connection, PreviewControls } from "./EdgePreview";')
s=s.replace('import { connect as serial_connect } from "@zmkfirmware/zmk-studio-ts-client/transport/serial";','').replace('import { connect as serial_connect } from "./edge-serial";','')
a=s.index('const TRANSPORTS:')
b=s.index('async function listen_for_notifications',a)
s=s[:a]+'const TRANSPORTS: TransportFactory[] = [{label:"USB",connect:async()=>({} as RpcTransport)}];\n\n'+s[b:]
s=re.sub(r'import \{ connect as gatt_connect \}[^\n]+\n','',s)
s=re.sub(r'import \{\n  connect as tauri_ble_connect,[\s\S]*?\} from "\./tauri/ble";\n','',s)
s=re.sub(r'import \{\n  connect as tauri_serial_connect,[\s\S]*?\} from "\./tauri/serial";\n','',s)
s=s.replace('create_rpc_connection(transport, { signal })','create_rpc_connection({ signal })').replace('  transport: RpcTransport,','  _transport: RpcTransport,')
s=s.replace('<div className="edge-studio">','<PreviewControls/><div className="edge-studio">')
s=s.replace('connectedDeviceLabel={connectedDeviceName}','connectedDeviceLabel={connectedDeviceName ? "Edge · UI preview" : undefined}')
p.write_text(s)
# A local fixture button avoids browser-managed upload storage during QA.
p=stage/'src/KeymapImport.tsx';s=p.read_text()
s='import qaWithoutUnlock from "./preview-import-no-unlock.keymap?raw";\n'+s
s='import qaSource from "./preview-import.keymap?raw";\n'+s
s=s.replace('<input ref={input}', '<button onClick={()=>void load(new File([qaWithoutUnlock],"edge-no-unlock.keymap"))}>Load QA import without unlock</button><button onClick={()=>void load(new File([qaSource],"edge-ui-import-test.keymap"))}>Load QA import fixture</button><input ref={input}')
p.write_text(s)
shutil.copyfile(ROOT/'web/tests/fixtures/edge-ui-import-test.keymap',stage/'src/preview-import.keymap')
(stage/'src/preview-import-no-unlock.keymap').write_text((ROOT/'web/tests/fixtures/edge-ui-import-test.keymap').read_text().replace('&studio_unlock','&none'))
subprocess.run(['./node_modules/.bin/tsc'],cwd=stage,check=True)
subprocess.run(['./node_modules/.bin/vite','build','--base='+os.environ.get('EDGE_SITE_BASE','')+'/studio-qa/','--outDir='+str(ROOT/'web/dist/studio-qa'),'--emptyOutDir=false'],cwd=stage,check=True)

subprocess.run(['python3',str(ROOT/'tools/finalize_studio.py'),'--directory','web/dist/studio-qa','--base',os.environ.get('EDGE_SITE_BASE','')],check=True)
