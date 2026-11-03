// SPDX-License-Identifier: GPL-3.0-or-later
import {Request,Response} from '@zmkfirmware/zmk-studio-ts-client';
// Session-only protocol metadata. Never retain payloads, bindings, names or IDs
// that identify hardware/hosts. Byte buffers are cleared at each frame boundary.
let latest:ReturnType<typeof createDiagnostics>|undefined;
export function usbReadDiagnostics(){return latest?.summary()||'';}
function method(value:any){for(const group of ['core','keymap','behaviors'])if(value[group]){const entry=Object.entries(value[group]).find(([,v])=>v!==undefined);return group+'.'+(entry?.[0]||'extension');}return 'notification';}
export function createDiagnostics(){
 let request='none',response='none',sentAt=0,receivedAt=0,receivedBytes=0,writeState='idle',decodeError=false,receivedAtRequest=0;
 function parser(onFrame:(bytes:Uint8Array)=>void){let bytes:number[]=[],inFrame=false,escaped=false;const push=(chunk:Uint8Array)=>{for(const byte of chunk){if(!inFrame){if(byte===0xab){inFrame=true;bytes=[];}continue;}if(escaped){bytes.push(byte);escaped=false;}else if(byte===0xac)escaped=true;else if(byte===0xab){bytes=[];decodeError=true;}else if(byte===0xad){try{onFrame(new Uint8Array(bytes));}catch{decodeError=true;}bytes=[];inFrame=false;}else bytes.push(byte);if(bytes.length>65536){bytes=[];inFrame=false;decodeError=true;}}};return {push,pending:()=>inFrame?bytes.length:0,open:()=>inFrame};}
 const outgoing=parser(bytes=>{const r=Request.decode(bytes);request=method(r)+' #'+r.requestId;sentAt=Date.now();receivedAtRequest=receivedBytes;});
 const incoming=parser(bytes=>{const r=Response.decode(bytes);if(r.requestResponse)response=method(r.requestResponse)+' #'+r.requestResponse.requestId;else response='notification';receivedAt=Date.now();});
 const result={write(chunk:Uint8Array){outgoing.push(chunk);writeState='pending';},written(){writeState='complete';},read(chunk:Uint8Array){receivedBytes+=chunk.length;incoming.push(chunk);},summary(){return `USB: last request ${request}${sentAt?` (${((Date.now()-sentAt)/1000).toFixed(1)}s ago)`:''}, write ${writeState}; last response ${response}${receivedAt?` (${((Date.now()-receivedAt)/1000).toFixed(1)}s ago)`:''}; ${receivedBytes} received bytes (${receivedBytes-receivedAtRequest} since last request); unfinished response ${incoming.open()?incoming.pending()+' payload bytes':'none'}${decodeError?'; framing/decode error observed':''}.`;}};
 latest=result;return result;
}
