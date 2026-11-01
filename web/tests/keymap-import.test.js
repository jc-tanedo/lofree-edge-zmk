import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { behaviorId, exportKeymap } from '../dist/keymap-export.js';
import { parseKeymap, planImport, applyImport, readImportContext, snapshotKey } from '../dist/keymap-import.js';
const original=JSON.parse(await readFile(new URL('./fixtures/edge-compiled-keymap.json',import.meta.url)));
const source=exportKeymap(original);
function metadata() {
  const result=new Map();
  for(const name of ['key_press','momentary_layer','toggle_layer','to_layer','transparent','none','bcklight','studio_unlock','prev_firmware','sysreset','bootload']) {
    let sets=[];
    if(name==='key_press') sets=[{param1:[{hidUsage:{keyboardMax:0xe7,consumerMax:0xfff}}],param2:[{nil:{}}]}];
    if(['momentary_layer','toggle_layer','to_layer'].includes(name)) sets=[{param1:[{layerId:{}}],param2:[{nil:{}}]}];
    if(name==='bcklight') sets=[{param1:[{range:{min:0,max:5}}],param2:[{nil:{}}]},{param1:[{constant:6}],param2:[{range:{min:0,max:100}}]}];
    result.set(behaviorId(name),{id:behaviorId(name),displayName:name,metadata:sets});
  }
  return result;
}
function device(options={}) {
  let map={...structuredClone(original),maxLayerNameLength:20}, saved=structuredClone(map), dirty=!!options.unsaved, writes=[];
  const details=metadata();let count=0;
  const rpc=async request=>{
    if(request.core) return {core:{getDeviceInfo:{name:'Lofree Edge ZMK'}}};
    if(request.behaviors?.listAllBehaviors) return {behaviors:{listAllBehaviors:{behaviors:[...details.keys()]}}};
    if(request.behaviors?.getBehaviorDetails) return {behaviors:{getBehaviorDetails:details.get(request.behaviors.getBehaviorDetails.behaviorId)}};
    const command=Object.keys(request.keymap)[0], value=request.keymap[command];
    if(command==='checkUnsavedChanges') return {keymap:{checkUnsavedChanges:dirty}};
    if(command==='getKeymap') return {keymap:{getKeymap:structuredClone(map)}};
    writes.push(command);
    if(command==='setLayerBinding') {
      if(++count===options.failSetAt) return {keymap:{setLayerBinding:2}};
      map.layers.find(layer=>layer.id===value.layerId).bindings[value.keyPosition]=structuredClone(value.binding);dirty=true;
      return {keymap:{setLayerBinding:0}};
    }
    if(command==='setLayerProps') {map.layers.find(layer=>layer.id===value.layerId).name=value.name;dirty=true;return {keymap:{setLayerProps:0}};}
    if(command==='addLayer') {
      const id=[0,1,2].find(id=>!map.layers.some(layer=>layer.id===id));
      const layer={id,name:'Spare',bindings:Array.from({length:84},()=>({behaviorId:behaviorId('transparent'),param1:0,param2:0}))};
      map.layers.push(layer);map.availableLayers--;dirty=true;return {keymap:{addLayer:{ok:{index:map.layers.length-1,layer:structuredClone(layer)}}}};
    }
    if(command==='removeLayer') {map.layers.splice(value.layerIndex,1);map.availableLayers++;dirty=true;return {keymap:{removeLayer:{ok:{}}}};}
    if(command==='saveChanges') {saved=structuredClone(map);if(options.saveFails)return {keymap:{saveChanges:{err:3}}};dirty=false;return {keymap:{saveChanges:{ok:true}}};}
    if(command==='discardChanges') {
      const names=new Map(map.layers.map(layer=>[layer.id,layer.name]));
      map=structuredClone(saved);
      if(options.discardKeepsNames) for(const layer of map.layers) layer.name=names.get(layer.id)??layer.name;
      dirty=false;return {keymap:{discardChanges:true}};
    }
    throw new Error(command);
  };
  return {rpc,writes,map:()=>structuredClone(map),externalChange:()=>{map.layers[0].name='Another computer';saved=structuredClone(map);}};
}

test('exported accepted keymap round-trips to identical native bindings, with no changes',()=>{
  const current={...original,maxLayerNameLength:20};
  const plan=planImport(parseKeymap(source),current,metadata());
  assert.equal(plan.changes.length,0);assert.equal(plan.add,0);assert.equal(plan.remove,0);
  assert.equal(snapshotKey({layers:plan.targets}),snapshotKey(current));
});

test('standard aliases, numeric layer defines, nested modifiers and BL_SET parse correctly',()=>{
  const edited='#define FN 1\n'+source.replace('&kp A /* A */','&kp LC(LS(B)) /* A */').replace('&mo 1 /* Fn */','&mo FN /* Fn */').replace('&bl 2 0 /* Esc */','&bl BL_SET 90 /* Esc */').replace('&kp ESCAPE','&kp ESC');
  const parsed=parseKeymap(edited);
  assert.equal(parsed.layers[0].bindings[46].param1,0x03070005);
  assert.equal(parsed.layers[0].bindings[79].param1,1);
  assert.deepEqual(parsed.layers[1].bindings[0],{action:'bcklight',param1:6,param2:90});
});

test('unsupported source features and compiled-behavior changes are explicitly rejected',()=>{
  for(const edited of [source.replace('&kp A /* A */','&mt LCTRL A /* A */'),source.replace('hold-ms = <3000>','hold-ms = <1000>'),'#include <custom.h>\n'+source,source.replace('  keymap {','  combos { };\n  keymap {')]) assert.throws(()=>parseKeymap(edited));
  assert.throws(()=>parseKeymap(source.replace('&kp A /* A */','')),/83/);
});

test('invalid parameters fail during planning before any writes',()=>{
  const edited=source.replace('&bl 2 0 /* Esc */','&bl 2 90 /* Esc */');
  assert.throws(()=>planImport(parseKeymap(edited),original,metadata()),/Invalid parameters/);
});

test('apply changes keys, layer names and spare-layer activation, verifies and saves once',async()=>{
  const target=device();
  const edited=source.replace('&kp A /* A */','&kp B /* A */').replace('display-name = "Fn"','display-name = "Function"').replace('      status = "reserved";','');
  const context=await readImportContext(target.rpc),plan=planImport(parseKeymap(edited),context.map,context.details);
  assert.equal(plan.add,1);
  const result=await applyImport(target.rpc,plan);
  assert.equal(result.layers.length,3);assert.equal(result.layers[1].name,'Function');
  assert.equal(result.layers[0].bindings[46].param1,0x70005);
  assert.equal(target.writes.filter(command=>command==='saveChanges').length,1);
  assert(!target.writes.includes('discardChanges'));
});

test('removing a trailing layer uses native removal and saves the resulting map',async()=>{
  const target=device();
  let context=await readImportContext(target.rpc);
  await applyImport(target.rpc,planImport(parseKeymap(source.replace('      status = "reserved";','')),context.map,context.details));
  context=await readImportContext(target.rpc);
  const result=await applyImport(target.rpc,planImport(parseKeymap(source),context.map,context.details));
  assert.equal(result.layers.length,2);assert(target.writes.includes('removeLayer'));
});

test('unsaved edits and device changes after preview block all mutations',async()=>{
  const dirty=device({unsaved:true});await assert.rejects(readImportContext(dirty.rpc),/Save or discard/);assert.equal(dirty.writes.length,0);
  const target=device(),context=await readImportContext(target.rpc),plan=planImport(parseKeymap(source),context.map,context.details);
  target.externalChange();await assert.rejects(applyImport(target.rpc,plan),/changed after preview/);assert.equal(target.writes.length,0);
});

test('a refused key write restores names even when native discard keeps an unsaved rename',async()=>{
  const target=device({failSetAt:1,discardKeepsNames:true}),context=await readImportContext(target.rpc);
  const edited=source.replace('&kp A /* A */','&kp B /* A */').replace('display-name = "Fn"','display-name = "Rename first"');
  const plan=planImport(parseKeymap(edited),context.map,context.details);
  await assert.rejects(applyImport(target.rpc,plan),/previously saved keymap was restored/);
  assert.equal(snapshotKey(target.map()),snapshotKey(context.map));
  assert(!target.writes.includes('saveChanges'));assert(target.writes.includes('discardChanges'));
});

test('a save failure reports possible partial persistence and never claims rollback',async()=>{
  const target=device({saveFails:true}),context=await readImportContext(target.rpc);
  const plan=planImport(parseKeymap(source.replace('&kp A /* A */','&kp B /* A */')),context.map,context.details);
  await assert.rejects(applyImport(target.rpc,plan),/Saving may be partial/);
  assert(!target.writes.includes('discardChanges'));
});

test('an unchanged import performs read-only verification and does not save',async()=>{
  const target=device(),context=await readImportContext(target.rpc);
  await applyImport(target.rpc,planImport(parseKeymap(source),context.map,context.details));
  assert.equal(target.writes.length,0);
});

test('layer targets use stable device IDs even when active IDs have gaps',()=>{
  const current=structuredClone(original);
  current.layers[1].id=2;
  current.layers[0].bindings[79].param1=2;
  const serialized=exportKeymap(current);
  const plan=planImport(parseKeymap(serialized),current,metadata());
  assert.equal(plan.changes.length,0);assert.deepEqual(plan.targets.map(layer=>layer.id),[0,2]);
  const enabled=serialized.replace('      status = "reserved";','').replace('&kp CAPSLOCK','&mo 2');
  const next=planImport(parseKeymap(enabled),current,metadata());
  assert.deepEqual(next.targets.map(layer=>layer.id),[0,2,1]);
});

test('inactive edited layers and excessive names fail instead of dropping edits',()=>{
  const edited=source.replace('display-name = "Spare";','display-name = "X".repeat(30);');
  assert.throws(()=>parseKeymap(edited));
  const long=source.replace('display-name = "Fn"','display-name = "'+ 'X'.repeat(30)+'"');
  assert.throws(()=>planImport(parseKeymap(long),original,metadata()),/name exceeds/);
  const reserved=source.replace('display-name = "Fn";','display-name = "Fn"; status = "reserved";');
  assert.throws(()=>parseKeymap(reserved),/reserved but contains mappings/);
});

test('Bluetooth and output bindings round-trip without firmware rebuilding',()=>{
 const map=structuredClone(original),details=metadata();
 details.set(behaviorId('bluetooth'),{id:behaviorId('bluetooth'),displayName:'Bluetooth',metadata:[{param1:[{constant:3},{constant:5}],param2:[{range:{min:0,max:2}}]},{param1:[{range:{min:0,max:2}},{constant:4}],param2:[]}]});
 details.set(behaviorId('outputs'),{id:behaviorId('outputs'),displayName:'Output',metadata:[{param1:[{range:{min:0,max:3}}],param2:[]}]});
 map.layers[1].bindings[16]={behaviorId:behaviorId('bluetooth'),param1:3,param2:2};
 map.layers[1].bindings[17]={behaviorId:behaviorId('bluetooth'),param1:0,param2:0};
 map.layers[1].bindings[18]={behaviorId:behaviorId('outputs'),param1:2,param2:0};
 const exported=exportKeymap(map);
 const plan=planImport(parseKeymap(exported),{...map,maxLayerNameLength:20},details);
 assert.equal(plan.changes.length,0);
 const symbolic=exported.replace('&bt 3 2','&bt BT_SEL 2').replace('&bt 0 0','&bt BT_CLR').replace('&out 2','&out OUT_BLE');
 assert.equal(planImport(parseKeymap(symbolic),{...map,maxLayerNameLength:20},details).changes.length,0);
 assert.throws(()=>planImport(parseKeymap(exported.replace('&bt 3 2','&bt BT_SEL 3')),{...map,maxLayerNameLength:20},details),/Invalid parameters/);
 assert.throws(()=>planImport(parseKeymap(exported),{...map,maxLayerNameLength:20},metadata()),/does not provide bluetooth/);
});

test('import rejects nonexistent fourth Edge profile even with upstream off-by-one metadata',()=>{
  const details=metadata();
  details.set(behaviorId('bluetooth'),{id:behaviorId('bluetooth'),metadata:[{param1:[{constant:3}],param2:[{range:{min:0,max:3}}]}]});
  const parsed=parseKeymap(source);
  parsed.layers[0].bindings[0]={action:'bluetooth',param1:3,param2:3};
  assert.throws(()=>planImport(parsed,original,details),/Invalid parameters/);
  parsed.layers[0].bindings[0].param2=2;
  assert.doesNotThrow(()=>planImport(parsed,original,details));
});
