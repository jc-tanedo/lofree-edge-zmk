// SPDX-License-Identifier: GPL-3.0-or-later
import {createDiagnostics} from './edge-usb-diagnostics';
import type {RpcTransport} from '@zmkfirmware/zmk-studio-ts-client/transport/index';
// Own the port locks so ending an RPC pipeline never closes an already-closed
// Web Serial stream or abandons the port before releasing its readers/writers.
export async function connect():Promise<RpcTransport>{
 const port=await navigator.serial.requestPort({});
 await port.open({baudRate:12500});
 if(!port.readable||!port.writable){await port.close();throw Error('The serial port did not open its streams.');}
 const reader=port.readable.getReader(),writer=port.writable.getWriter(),abortController=new AbortController();
 let closing=false,readClosed=false,control:ReadableStreamDefaultController<Uint8Array>|undefined,closePromise:Promise<void>|undefined;
 let pendingRead:Promise<ReadableStreamReadResult<Uint8Array>>|undefined;
 const leave=()=>abortController.abort('Studio page left');
 function close(reason?:unknown,graceful=false):Promise<void>{
  if(closePromise)return closePromise;
  closing=true;
  closePromise=(async()=>{
   const stopping=[reader.cancel(reason),graceful?writer.close():writer.abort(reason)];
   reader.releaseLock();writer.releaseLock();
   if(!readClosed){readClosed=true;control?.close();}
   window.removeEventListener('pagehide',leave);
   await Promise.allSettled(stopping);
   await port.close();
  })();
  return closePromise;
 }
 // A CDC close does not flush firmware TX. Drain old responses before the new
 // RPC client allocates request IDs. Keep the pending read after the quiet
 // deadline: cancelling it would also cancel the usable serial stream.
 abortController.signal.addEventListener('abort',()=>{void close(abortController.signal.reason).catch(error=>console.error('Serial port cleanup failed',error));},{once:true});
 window.addEventListener('pagehide',leave,{once:true});
 try {
  const deadline=Date.now()+1500;
  while(!closing){
   pendingRead=reader.read();
   let timer:ReturnType<typeof setTimeout>|undefined;
   const result=await Promise.race([pendingRead,new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),150);})]);
   clearTimeout(timer);
   if(result===null)break;
   pendingRead=undefined;
   if(result.done)throw Error('The keyboard disconnected while opening USB.');
   if(Date.now()>=deadline)throw Error('The previous USB session is still sending data. Reconnect and retry.');
  }
  if(closing)throw Error('Studio left while opening USB.');
 }catch(error){await close(error);throw error;}
 const diagnostics=createDiagnostics();
 const readable=new ReadableStream<Uint8Array>({
  start(c){control=c;},
  async pull(c){try{const read=pendingRead||reader.read();pendingRead=undefined;const result=await read;if(closing)return;if(result.done){readClosed=true;c.close();void close().catch(()=>{});}else {diagnostics.read(result.value);c.enqueue(result.value);}}catch(error){if(!closing){readClosed=true;c.error(error);void close(error).catch(()=>{});}}},
  cancel(reason){readClosed=true;return close(reason);}
 });
 const writable=new WritableStream<Uint8Array>({write:async chunk=>{diagnostics.write(chunk);await writer.write(chunk);diagnostics.written();},close:()=>close(undefined,true),abort:reason=>close(reason)});
 const info=port.getInfo();return {label:`${info.usbVendorId||0}:${info.usbProductId||0}`,abortController,readable,writable};
}
