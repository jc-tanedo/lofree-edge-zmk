// SPDX-License-Identifier: GPL-3.0-or-later
import type {RpcTransport} from '@zmkfirmware/zmk-studio-ts-client/transport/index';
// Own the port locks so ending an RPC pipeline never closes an already-closed
// Web Serial stream or abandons the port before releasing its readers/writers.
export async function connect():Promise<RpcTransport>{
 const port=await navigator.serial.requestPort({});
 await port.open({baudRate:12500});
 if(!port.readable||!port.writable){await port.close();throw Error('The serial port did not open its streams.');}
 const reader=port.readable.getReader(),writer=port.writable.getWriter(),abortController=new AbortController();
 let closing=false,readClosed=false,control:ReadableStreamDefaultController<Uint8Array>,closePromise:Promise<void>|undefined;
 const leave=()=>abortController.abort('Studio page left');
 function close(reason?:unknown,graceful=false):Promise<void>{
  if(closePromise)return closePromise;
  closing=true;
  closePromise=(async()=>{
   const stopping=[reader.cancel(reason),graceful?writer.close():writer.abort(reason)];
   reader.releaseLock();writer.releaseLock();
   if(!readClosed){readClosed=true;control.close();}
   window.removeEventListener('pagehide',leave);
   await Promise.allSettled(stopping);
   await port.close();
  })();
  return closePromise;
 }
 const readable=new ReadableStream<Uint8Array>({
  start(c){control=c;},
  async pull(c){try{const result=await reader.read();if(closing)return;if(result.done){readClosed=true;c.close();void close().catch(()=>{});}else c.enqueue(result.value);}catch(error){if(!closing){readClosed=true;c.error(error);void close(error).catch(()=>{});}}},
  cancel(reason){readClosed=true;return close(reason);}
 });
 const writable=new WritableStream<Uint8Array>({write:chunk=>writer.write(chunk),close:()=>close(undefined,true),abort:reason=>close(reason)});
 abortController.signal.addEventListener('abort',()=>{void close(abortController.signal.reason).catch(error=>console.error('Serial port cleanup failed',error));},{once:true});
 window.addEventListener('pagehide',leave,{once:true});
 const info=port.getInfo();return {label:`${info.usbVendorId||0}:${info.usbProductId||0}`,abortController,readable,writable};
}
