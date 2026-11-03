// SPDX-License-Identifier: GPL-3.0-or-later
import {useContext,useEffect,useState} from 'react';
import type {BehaviorBinding} from '@zmkfirmware/zmk-studio-ts-client/keymap';
import {ConnectionContext} from './rpc/ConnectionContext';
import {useEdgeKeymapData} from './useEdgeKeymapData';
import {useKeymapDraft} from './EdgeDraft';
import {EdgeWorkspace} from './EdgeWorkspace';
import {IDS} from './edge-export/studio-actions.js';
import {useSub} from './usePubSub';
export default function EdgeKeyboard(){
 const data=useEdgeKeymapData(),draft=useKeymapDraft(),connection=useContext(ConnectionContext);
 const [layer,setLayer]=useState(0),[key,setKey]=useState<number>();
 useEffect(()=>{if(data.keymap)draft.store.load(data.keymap);},[data.keymap]);
 useEffect(()=>{setLayer(0);setKey(undefined);},[connection]);
 useEffect(()=>{if(draft.map)setLayer(i=>Math.min(i,draft.map!.layers.length-1));},[draft.map]);
 useSub('edge.keymap.imported',fresh=>draft.store.load(fresh,true));
 function assign(binding:BehaviorBinding){if(key===undefined)return;draft.store.edit(map=>{map.layers[layer].bindings[key]=binding;});}
 function add(){let selected=0;draft.store.edit(map=>{const capacity=map.layers.length+map.availableLayers;if(!map.availableLayers)throw Error('No spare layer available.');const id=Array.from({length:capacity},(_,i)=>i).find(id=>!map.layers.some(l=>l.id===id))!;selected=map.layers.length;map.layers.push({id,name:'Layer '+(selected+1),bindings:map.layers[0].bindings.map(()=>({behaviorId:IDS.transparent,param1:0,param2:0}))});map.availableLayers--;});setLayer(selected);}
 return <><EdgeWorkspace keymap={data.keymap?draft.map:undefined} layout={data.layouts?.[data.selectedPhysicalLayoutIndex]} behaviors={data.behaviors} selectedLayerIndex={layer} selectedKeyPosition={key} onLayer={setLayer} onKey={setKey} onBinding={assign} onAdd={add} onRemove={()=>draft.store.edit(map=>{if(map.layers.length<=1)throw Error('Keep at least one layer.');map.layers.splice(layer,1);map.availableLayers++;})} onMove={(from,to)=>{draft.store.edit(map=>{map.layers.splice(to,0,map.layers.splice(from,1)[0]);});setLayer(to);}} onRename={(id,_old,name)=>draft.store.edit(map=>{map.layers.find(l=>l.id===id)!.name=name;})} loadingError={data.loadingError} readProgress={data.readProgress} onRetry={data.retry}/>{draft.error&&<div role="alert" className="edge-inline-error edge-unlock-warning">{draft.error} <button className="edge-button" onClick={()=>data.retry()}>Reconnect and read keyboard</button></div>}</>;
}
