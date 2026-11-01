// Isolated fixture only. No hardware calls or flash writes are possible.
const hid = new EventTarget();
const device = new EventTarget();
const reports = [{ reportId:4, items:[{reportSize:8,reportCount:63}] },{ reportId:5,items:[{reportSize:8,reportCount:32}] }];
Object.assign(device, { vendorId:0x05ac,productId:0x0256,productName:'EDGE84@Lofree',opened:false,
 collections:[{usagePage:0xff1c,usage:0x92,inputReports:reports,outputReports:reports}],
 open:async()=>{device.opened=true;},close:async()=>{device.opened=false;},
 sendReport:async(id,payload)=>{
  if(id!==4)throw new Error('UI preview blocks all firmware writes');
  const reply=Uint8Array.of(id,...payload);
  reply.set([0,1,2,3,4,5,6,7,8,9,10,11,12,13,44,15],8);
  const event=new Event('inputreport');Object.assign(event,{device,reportId:4,data:new DataView(reply.slice(1).buffer)});
  queueMicrotask(()=>device.dispatchEvent(event));
 }
});
hid.requestDevice=async()=>[device];
Object.defineProperty(navigator,'hid',{value:hid,configurable:true});

document.addEventListener('DOMContentLoaded',()=>{const label=document.createElement('aside');label.textContent='UI PREVIEW — USB is mocked; all firmware writes are blocked';label.style.cssText='padding:12px;background:#f7e6a7;color:#665015;position:relative;z-index:120';document.body.prepend(label);});
