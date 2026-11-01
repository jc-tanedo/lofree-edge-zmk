import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { behaviorId, exportLayout, exportKeymap, exportFiles, exportZip } from '../dist/keymap-export.js';
const compiled = JSON.parse(await readFile(new URL('./fixtures/edge-compiled-keymap.json', import.meta.url)));

test('info.json preserves visual geometry and sequential text rows in dense binding order', () => {
  const layout = exportLayout().layouts.LAYOUT.layout;
  assert.equal(layout.length,84);
  assert.equal(layout[76].label,'Space');
  assert.equal(layout[79].label,'Fn');
  assert.equal(layout[44].label,'Delete');
  assert.equal(layout[44].y,0); // visual top row, but later in binding order
  assert.equal(layout[44].row,2);
  assert.equal(layout[44].col,14);
  assert(layout.every((key,index)=>!index || key.row>=layout[index-1].row));
  assert.equal(new Set(layout.map(key=>`${key.row},${key.col}`)).size,84);
  assert(layout.every(key=>key.w>0 && key.h>0 && key.x>=0 && key.y>=0));
});

test('all behavior IDs used by the accepted compiled image resolve without guessing names', () => {
  for(const [id,name] of Object.entries(compiled.behaviorNames)) assert.equal(behaviorId(name),Number(id));
  const source = exportKeymap(compiled);
  assert.equal((source.match(/&kp /g)||[]).length,compiled.layers.flatMap(layer=>layer.bindings).filter(binding=>binding.behaviorId===behaviorId('key_press')).length);
  assert(source.includes('&kp LG(TAB)'));
  assert(source.includes('&kp C_VOLUME_UP'));
  assert(source.includes('&studio_unlock'));
  assert(source.includes('&edge_stock_return'));
  assert(source.includes('compatible = "zmk,behavior-prev-firmware"'));
  assert(source.includes('hold-ms = <3000>'));
  assert(source.includes('status = "reserved"'));
  assert.equal((source.match(/\/\* Space \*\//g)||[]).length,3);
});

test('current remaps and renamed/reordered layer references are exported from the supplied device snapshot', () => {
  const snapshot = structuredClone(compiled);
  const custom = {id:2,name:'My "layer"',bindings:structuredClone(snapshot.layers[0].bindings)};
  snapshot.layers.push(custom);
  snapshot.layers=[snapshot.layers[0],custom,snapshot.layers[1]];
  snapshot.layers[0].bindings[45]={behaviorId:behaviorId('momentary_layer'),param1:2,param2:0};
  const source=exportKeymap(snapshot);
  assert(source.includes('&mo 1 /* CapsLock */')); // old stable ID2 -> source index1
  assert(source.includes('&mo 2 /* Fn */')); // old stable ID1 -> source index2
  assert(source.includes('display-name = '+JSON.stringify(custom.name)+';'));
  assert(!source.includes('status = "reserved"'));
  assert.equal(compiled.layers[0].bindings[45].behaviorId,behaviorId('key_press'));
});

test('unknown actions and malformed snapshots stop instead of silently dropping mappings', () => {
  const snapshot=structuredClone(compiled);
  snapshot.layers[0].bindings[0].behaviorId=0;
  assert.throws(()=>exportKeymap(snapshot),/Unknown behavior/);
  snapshot.layers[0].bindings.pop();
  assert.throws(()=>exportKeymap(snapshot),/84 bindings/);
});

test('export packages the named editor files into a single standard ZIP download', () => {
  const files=exportFiles(compiled);
  const zip=exportZip(files), view=new DataView(zip.buffer);
  assert.equal(view.getUint32(0,true),0x04034b50);
  assert.equal(view.getUint32(zip.length-22,true),0x06054b50);
  assert.equal(view.getUint16(zip.length-14,true),3);
  assert.deepEqual(Object.keys(files),['info.json','lofree_edge.keymap','README.txt']);
});
