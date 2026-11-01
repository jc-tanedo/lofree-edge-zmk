// Used only by the offline compiled-firmware emulator, never by the browser app.
import assert from 'node:assert/strict';
import { createInterface } from 'node:readline';
import { exportKeymap } from '../dist/keymap-export.js';
import { parseKeymap, planImport, readImportContext, applyImport } from '../dist/keymap-import.js';
const lines=createInterface({input:process.stdin});
let resolve;
lines.on('line',line=>{const next=resolve;resolve=null;next(JSON.parse(line));});
const rpc=request=>new Promise(done=>{resolve=done;process.stdout.write(JSON.stringify({rpc:request})+'\n');});
try {
  const context=await readImportContext(rpc);
  const source=exportKeymap(context.map).replace('&kp A /* A */','&kp B /* A */')
    .replace('display-name = "Fn"','display-name = "Imported Fn"')
    .replace('display-name = "Custom";','display-name = "Custom";\n      status = "reserved";');
  const plan=planImport(parseKeymap(source),context.map,context.details);
  let refused=false;
  const refuseOnce=request=>{
    if(request.keymap?.setLayerBinding && !refused) {refused=true;return Promise.resolve({keymap:{setLayerBinding:2}});}
    return rpc(request);
  };
  await assert.rejects(applyImport(refuseOnce,plan),/previously saved keymap was restored/);
  const result=await applyImport(rpc,plan);
  assert.equal(result.layers.length,2);
  assert.equal(result.layers[1].name,'Imported Fn');
  assert.equal(result.layers[0].bindings[46].param1,0x70005);
  process.stdout.write(JSON.stringify({done:true})+'\n');
} catch(error) {process.stdout.write(JSON.stringify({error:String(error.stack??error)})+'\n');process.exitCode=1;}
finally {lines.close();}
