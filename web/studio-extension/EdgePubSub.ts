// SPDX-License-Identifier: MIT
// Adapted from pinned ZMK Studio usePubSub: retain subscriptions across renders.
import Emittery from 'emittery';
import {useEffect,useRef} from 'react';
const emitter=new Emittery();
const publish=(name:PropertyKey,data:any)=>emitter.emit(name,data);
export const usePub=()=>publish;
export function useSub(name:PropertyKey,callback:(data:any)=>void|Promise<void>){
 const latest=useRef(callback),remove=useRef<()=>void>();latest.current=callback;
 useEffect(()=>{const off=emitter.on(name,data=>latest.current(data));remove.current=off;return()=>{off();remove.current=undefined;};},[name]);
 return()=>remove.current?.();
}
