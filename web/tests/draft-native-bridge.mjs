// SPDX-License-Identifier: GPL-3.0-or-later
// Offline compiled-firmware test only.
import assert from 'node:assert/strict';
import {createInterface} from 'node:readline';
import {KeymapDraft} from '../dist/keymap-draft.js';
import {IDS} from '../dist/studio-actions.js';
import {snapshotKey} from '../dist/keymap-import.js';
const lines=createInterface({input:process.stdin});let resolve;let writes=0;
lines.on('line',line=>{const next=resolve;resolve=null;next(JSON.parse(line));});
const rpc=request=>new Promise(done=>{if(!request.keymap?.getKeymap)writes++;resolve=done;process.stdout.write(JSON.stringify({rpc:request})+'\n');});
try {
 const base=(await rpc({keymap:{getKeymap:true}})).keymap.getKeymap;const d=new KeymapDraft();d.load(base);
 d.edit(map=>{map.layers[0].bindings[0]={behaviorId:IDS.key_press,param1:0x70005,param2:0};map.layers[1].name='Draft Fn';map.layers.splice(1,0,map.layers.pop());});
 assert.equal(writes,0);assert.equal(snapshotKey((await rpc({keymap:{getKeymap:true}})).keymap.getKeymap),snapshotKey(base));
 d.undo();d.redo();assert.equal(writes,0);
 await d.save(rpc,async()=>true);assert.equal(d.state.count,0);assert.equal(d.state.map.layers[0].bindings[0].param1,0x70005);
 d.edit(map=>{map.layers=map.layers.filter(l=>l.id!==2);map.availableLayers++;});await d.save(rpc,async()=>true);
 d.edit(map=>{map.layers.push({id:2,name:'Draft extra',bindings:map.layers[0].bindings.map(()=>({behaviorId:IDS.transparent,param1:0,param2:0}))});map.availableLayers--;});await d.save(rpc,async()=>true);
 process.stdout.write(JSON.stringify({done:true})+'\n');
}catch(error){process.stdout.write(JSON.stringify({error:String(error.stack??error)})+'\n');process.exitCode=1;}finally{lines.close();}
