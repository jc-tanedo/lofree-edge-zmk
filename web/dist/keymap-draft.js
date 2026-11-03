// SPDX-License-Identifier: GPL-3.0-or-later
import { IDS } from './studio-actions.js';
import { snapshotKey } from './keymap-import.js';
import { assertUnlockSaveAllowed } from './unlock-guard.js';
const clone = value => structuredClone(value);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const binding = b => ({behaviorId:b?.behaviorId,param1:b?.param1||0,param2:b?.param2||0});
export function draftChangeCount(base,map) {
  if(!base || !map) return 0;
  let count=0;
  const old=new Map(base.layers.map(l=>[l.id,l])), next=new Map(map.layers.map(l=>[l.id,l]));
  for(const id of new Set([...old.keys(),...next.keys()])) {
    const a=old.get(id),b=next.get(id);
    if(!a||!b) {count++;continue;}
    if(a.name!==b.name)count++;
    b.bindings.forEach((v,i)=>{if(!same(binding(a.bindings[i]),binding(v)))count++;});
  }
  const left=base.layers.filter(l=>next.has(l.id)).map(l=>l.id),right=map.layers.filter(l=>old.has(l.id)).map(l=>l.id);
  if(!same(left,right))count++;
  return count;
}
const layerActions=new Set([IDS.momentary_layer,IDS.toggle_layer,IDS.to_layer]);
function validate(base,target) {
  const capacity=base.layers.length+base.availableLayers;
  const ids=new Set(target.layers.map(l=>l.id));
  if(!target.layers.length||target.layers.length>capacity||ids.size!==target.layers.length)throw Error('Invalid draft layer count.');
  for(const l of target.layers) {
    if(!Number.isInteger(l.id)||l.id<0||l.id>=capacity||l.bindings.length!==base.layers[0].bindings.length)throw Error('Invalid draft layer.');
    if(new TextEncoder().encode(l.name).length>(base.maxLayerNameLength||20))throw Error('Layer name is too long.');
    for(const b of l.bindings)if(layerActions.has(b.behaviorId)&&!ids.has(b.param1||0))throw Error('A key refers to a removed layer. Reassign it before saving.');
  }
}
async function applyTarget(rpc,current,target,changed) {
  const ids=new Map(current.layers.map(l=>[l.id,l.id]));
  let live=clone(current);
  for(const layer of target.layers)if(!ids.has(layer.id)) {
    changed();const added=(await rpc({keymap:{addLayer:{}}})).keymap?.addLayer?.ok;
    if(!added?.layer)throw Error('The keyboard refused a new layer.');
    ids.set(layer.id,added.layer.id);live.layers.push(added.layer);
  }
  const actual=clone(target);
  for(const layer of actual.layers) {
    layer.id=ids.get(layer.id);
    layer.bindings=layer.bindings.map(b=>({...binding(b),param1:layerActions.has(b.behaviorId)?ids.get(b.param1||0):b.param1||0}));
  }
  const wanted=new Set(actual.layers.map(l=>l.id));
  for(let i=live.layers.length-1;i>=0;i--)if(!wanted.has(live.layers[i].id)) {
    changed();if(!(await rpc({keymap:{removeLayer:{layerIndex:i}}})).keymap?.removeLayer?.ok)throw Error('The keyboard refused layer removal.');
    live.layers.splice(i,1);
  }
  for(let i=0;i<actual.layers.length;i++) {
    const targetLayer=actual.layers[i],from=live.layers.findIndex(l=>l.id===targetLayer.id);
    if(from!==i) {
      changed();if(!(await rpc({keymap:{moveLayer:{startIndex:from,destIndex:i}}})).keymap?.moveLayer?.ok)throw Error('The keyboard refused layer ordering.');
      live.layers.splice(i,0,live.layers.splice(from,1)[0]);
    }
    const old=live.layers[i];
    if(old.name!==targetLayer.name) {
      changed();if((await rpc({keymap:{setLayerProps:{layerId:targetLayer.id,name:targetLayer.name}}})).keymap?.setLayerProps!==0)throw Error('The keyboard refused a layer name.');
    }
    for(let position=0;position<targetLayer.bindings.length;position++)if(!same(binding(old.bindings[position]),binding(targetLayer.bindings[position]))) {
      changed();if((await rpc({keymap:{setLayerBinding:{layerId:targetLayer.id,keyPosition:position,binding:targetLayer.bindings[position]}}})).keymap?.setLayerBinding!==0)throw Error('The keyboard refused a key assignment.');
    }
  }
  return actual;
}
export class KeymapDraft {
  listeners=new Set(); past=[]; future=[];
  state={base:undefined,map:undefined,count:0,canUndo:false,canRedo:false,saving:false,error:'',uncertain:false};
  subscribe=listener=>{this.listeners.add(listener);return()=>this.listeners.delete(listener);};
  getSnapshot=()=>this.state;
  emit(patch={}) {
    this.state={...this.state,...patch};this.state={...this.state,count:draftChangeCount(this.state.base,this.state.map),canUndo:!!this.past.length,canRedo:!!this.future.length};
    this.listeners.forEach(fn=>fn());
  }
  load(map,force=false) {
    if(this.state.uncertain&&!force&&this.state.map) {this.past=[];this.future=[];this.emit({base:clone(map),uncertain:false,error:snapshotKey(map)===snapshotKey(this.state.map)?'':'Device refreshed after a failed Save. Review the draft before saving again.'});return;}
    if(this.state.count&&!force&&!this.state.uncertain) {
      if(snapshotKey(map)!==snapshotKey(this.state.base))this.emit({error:'The keyboard changed outside this draft. Export your draft or Discard to reload before saving.'});
      return;
    }
    this.past=[];this.future=[];this.emit({base:clone(map),map:clone(map),error:'',uncertain:false});
  }
  edit(fn) {
    if(this.state.uncertain)throw Error('Reconnect and read the keyboard before editing this draft.');
    if(!this.state.map||this.state.saving)return;
    const next=clone(this.state.map);fn(next);
    if(snapshotKey(next)===snapshotKey(this.state.map))return;
    this.past.push(clone(this.state.map));this.future=[];this.emit({map:next,error:''});
  }
  replace(map){this.edit(draft=>Object.assign(draft,clone(map)));}
  undo(){if(this.state.saving||!this.past.length)return;this.future.push(clone(this.state.map));this.emit({map:this.past.pop(),error:''});}
  redo(){if(this.state.saving||!this.future.length)return;this.past.push(clone(this.state.map));this.emit({map:this.future.pop(),error:''});}
  discard(){if(this.state.base)this.load(this.state.base,true);}
  clear(){this.past=[];this.future=[];this.emit({base:undefined,map:undefined,error:'',uncertain:false});}
  async save(rpc,readPolicy) {
    if(!this.state.map||this.state.saving||this.state.uncertain)throw Error('Reconnect and read the keyboard before saving.');
    const target=clone(this.state.map),base=clone(this.state.base);let mutated=false,saveSent=false;
    this.emit({saving:true,error:''});
    try {
      const current=(await rpc({keymap:{getKeymap:true}})).keymap?.getKeymap;
      if(!current||snapshotKey(current)!==snapshotKey(base))throw Error('The keyboard changed outside this draft. Nothing was written. Export your draft or Discard to reload.');
      validate(base,target);await assertUnlockSaveAllowed(rpc,readPolicy,target);
      const expected=await applyTarget(rpc,current,target,()=>{mutated=true;});
      const active=(await rpc({keymap:{getKeymap:true}})).keymap?.getKeymap;
      if(!active||snapshotKey(active)!==snapshotKey(expected))throw Error('Active keymap readback did not match the draft.');
      saveSent=true;if(!(await rpc({keymap:{saveChanges:true}})).keymap?.saveChanges?.ok)throw Error('The keyboard did not confirm saving.');
      const actual=(await rpc({keymap:{getKeymap:true}})).keymap?.getKeymap;
      if(!actual||snapshotKey(actual)!==snapshotKey(expected))throw Error('Saved keymap readback did not match.');
      this.load(actual,true);return actual;
    } catch(error) {
      const message=(error instanceof Error?error.message:String(error))+(saveSent?' Save outcome may be partial; reconnect and read the device.':mutated?' Some active RAM changes may have applied; reconnect and read the device.':'');
      this.emit({error:message,uncertain:mutated||saveSent});throw Error(message);
    } finally {this.emit({saving:false});}
  }
}
