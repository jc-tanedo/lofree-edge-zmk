// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict';
import {connect} from '../studio-extension/edge-serial';
import {create_rpc_connection} from '@zmkfirmware/zmk-studio-ts-client';
async function scenario(mode:'close'|'abort'|'leave'){
 const events:string[]=[];const page=new EventTarget();let done!:()=>void;const closed=new Promise<void>(r=>done=r);
 const port={open:async()=>{},getInfo:()=>({usbVendorId:0x1d50,usbProductId:0x615e}),writable:new WritableStream<Uint8Array>({close(){events.push('write close');},abort(){events.push('write abort');}}),readable:new ReadableStream<Uint8Array>({cancel(){events.push('read cancel');}}),close:async()=>{assert(!port.readable.locked);assert(!port.writable.locked);events.push('port close');done();}};
 Object.defineProperty(globalThis,'navigator',{value:{serial:{requestPort:async()=>port}},configurable:true});
 Object.defineProperty(globalThis,'window',{value:page,configurable:true});
 const transport=await connect();const ac=new AbortController();const conn=create_rpc_connection(transport,{signal:ac.signal});
 if(mode==='close')await conn.request_writable.close();else if(mode==='abort')ac.abort('test');else page.dispatchEvent(new Event('pagehide'));
 let timer:ReturnType<typeof setTimeout>|undefined;
 await Promise.race([closed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Port cleanup timed out')),1000);})]);clearTimeout(timer);
 transport.abortController.abort('again');await Promise.resolve();assert.equal(events.filter(e=>e==='port close').length,1);
 console.log('PASS: real RPC pipeline serial cleanup',mode,'releases both locks and closes exactly once');
}
await scenario('close');await scenario('abort');await scenario('leave');
