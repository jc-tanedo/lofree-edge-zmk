// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict';
import {connect} from '../studio-extension/edge-serial';
import {create_rpc_connection,call_rpc,Request,Response} from '@zmkfirmware/zmk-studio-ts-client';
function frame(value:any){const bytes=Response.encode(Response.fromPartial(value)).finish(),out=[0xab];for(const b of bytes){if([0xab,0xac,0xad].includes(b))out.push(0xac);out.push(b);}return new Uint8Array([...out,0xad]);}
async function scenario(mode: "clean"|"stale"|"fragmented") {
let input:ReadableStreamDefaultController<Uint8Array>;const pending:number[]=[];let escaped=false;
const page=new EventTarget();let closed=false;let didClose!:()=>void;const portClosed=new Promise<void>(r=>didClose=r);
const port={getInfo:()=>({}),open:async()=>{},close:async()=>{closed=true;didClose();},
 readable:new ReadableStream<Uint8Array>({start(c){input=c; // An unread old response, observed across CDC reopen in compiled3fde7a03.
 const stale=frame({requestResponse:{requestId:999,keymap:{getKeymap:{layers:[]}}}});
 if(mode==="stale")c.enqueue(stale);
 if(mode==="fragmented"){c.enqueue(stale.subarray(3,6));setTimeout(()=>c.enqueue(stale.subarray(6)),50);}},cancel(){}}),
 writable:new WritableStream<Uint8Array>({write(chunk){for(const b of chunk){if(escaped){pending.push(b);escaped=false;}else if(b===0xac)escaped=true;else if(b===0xab)pending.length=0;else if(b===0xad){const req=Request.decode(new Uint8Array(pending));input.enqueue(frame({requestResponse:{requestId:req.requestId,...(req.core?{core:{getDeviceInfo:{name:'Test keyboard'}}}:{keymap:{getKeymap:{layers:[{id:0,name:'Base',bindings:[]}]}}})}}));}else pending.push(b);}}})};
Object.defineProperty(globalThis,'navigator',{value:{serial:{requestPort:async()=>port}},configurable:true});
Object.defineProperty(globalThis,'window',{value:page,configurable:true});
const t=await connect(),ac=new AbortController(),conn=create_rpc_connection(t,{signal:ac.signal});
try{
 const info=await call_rpc(conn,{core:{getDeviceInfo:true}});assert.equal(info.core?.getDeviceInfo?.name,'Test keyboard');
 const map=await call_rpc(conn,{keymap:{getKeymap:true}});assert.equal(map.keymap?.getKeymap?.layers[0].name,'Base');
 console.log('PASS: real RPC client reads info and keymap after serial reopen:',mode);
}finally{await conn.request_writable.close();ac.abort('test complete');}
let timer:ReturnType<typeof setTimeout>|undefined;
await Promise.race([portClosed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error("Port cleanup timed out")),1000);})]);clearTimeout(timer);assert(closed);
}
await scenario('clean');await scenario('stale');await scenario('fragmented');
async function startupFailure(mode:'continuous'|'leave'){
 const page=new EventTarget();let timer:ReturnType<typeof setInterval>|undefined,closed=false;
 const port={getInfo:()=>({}),open:async()=>{},close:async()=>{closed=true;},
  readable:new ReadableStream<Uint8Array>({start(c){if(mode==='continuous')timer=setInterval(()=>c.enqueue(new Uint8Array([1])),10);},cancel(){clearInterval(timer);}}),
  writable:new WritableStream<Uint8Array>()};
 Object.defineProperty(globalThis,'navigator',{value:{serial:{requestPort:async()=>port}},configurable:true});
 Object.defineProperty(globalThis,'window',{value:page,configurable:true});
 if(mode==='leave')setTimeout(()=>page.dispatchEvent(new Event('pagehide')),10);
 await assert.rejects(connect(),mode==='continuous'?/previous USB session/:/disconnected|Studio left/);
 assert(closed);assert(!port.readable.locked);assert(!port.writable.locked);
 console.log('PASS: startup closes and releases port on',mode);
}
await startupFailure('continuous');await startupFailure('leave');
