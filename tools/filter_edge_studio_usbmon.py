# SPDX-License-Identifier: GPL-3.0-or-later
"""Filter usbmon text to Edge CDC transfer metadata; never save raw payloads.

Input may include unrelated USB traffic. Select only 1d50:615e CDC bulk endpoints
5 OUT / 2 IN for this board. HID/other devices/addresses/URB pointers are omitted.
The output must be outside the public source tree and is created mode0600.
"""
import argparse
import os
from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]
LINE=re.compile(r'^\S+\s+(\d+)\s+([SCE])\s+B([io]):(\d+):(\d+):(\d+)\s+(-?\d+)\s+(\d+)(?:\s+=\s*(.*))?$')

def varint(data,offset):
    value=0
    for shift in range(0,35,7):
        byte=data[offset];offset+=1;value|=(byte&127)<<shift
        if not byte&128:return value,offset
    raise ValueError('Invalid varint')

class Metadata:
    def __init__(self,device):
        self.device=device;self.origin=None;self.pending={};self.sequence=0
        self.frame=None;self.escaped=False
    def feed(self,line):
        m=LINE.match(line.strip())
        if not m:return []
        stamp,event,direction,bus,dev,ep,status,size,payload=m.groups()
        if (int(bus),int(dev))!=self.device or (direction,int(ep)) not in [('o',5),('i',2)]:return []
        stamp=int(stamp)
        if self.origin is None:self.origin=stamp
        pointer=line.split()[0] # Ephemeral correlation only; never emitted.
        if event=='S':
            self.sequence+=1
            if len(self.pending)>=512:self.pending.clear()
            self.pending[pointer]=self.sequence
        ticket=self.pending.get(pointer,0)
        if event!='S':self.pending.pop(pointer,None)
        result=[f'{(stamp-self.origin)/1000000:.6f}s {"OUT" if direction=="o" else "IN"} {event} ticket={ticket} bytes={int(size)} status={int(status)}']
        # Parse OUT frames only to emit the sequence number and subsystem tag.
        # No request parameters, bindings or names are retained in output.
        if event=='S' and direction=='o' and int(size):
            try:
                tokens=(payload or '').split();hexdata=''
                for token in tokens:
                    if not re.fullmatch(r'(?:[0-9a-fA-F]{2})+',token):break
                    hexdata+=token
                data=bytes.fromhex(hexdata)
                if len(data)!=int(size):
                    self.frame=None;self.escaped=False
                    return result+['OUT payload truncated by usbmon; frame metadata unavailable']
                for byte in data:
                    if self.frame is None:
                        if byte==0xab:self.frame=bytearray();self.escaped=False
                    elif self.escaped:self.frame.append(byte);self.escaped=False
                    elif byte==0xac:self.escaped=True
                    elif byte==0xab:self.frame=bytearray()
                    elif byte==0xad:
                        frame=self.frame;self.frame=None
                        offset=0;request=0;tag,offset=varint(frame,offset)
                        if tag==8:request,offset=varint(frame,offset);tag,offset=varint(frame,offset)
                        group={26:'core',34:'behaviors',42:'keymap'}.get(tag)
                        if group:result.append(f'RPC request #{request} subsystem={group} frame_payload_bytes={len(frame)}')
                    else:self.frame.append(byte)
                    if self.frame is not None and len(self.frame)>4096:self.frame=None;self.escaped=False
            except (ValueError,IndexError):
                self.frame=None;self.escaped=False
                result.append('OUT frame metadata unavailable')
        return result

def device():
    found=[]
    for entry in Path('/sys/bus/usb/devices').iterdir():
        try:
            if (entry/'idVendor').read_text().strip()=='1d50' and (entry/'idProduct').read_text().strip()=='615e':
                found.append((int((entry/'busnum').read_text()),int((entry/'devnum').read_text())))
        except (OSError,ValueError):pass
    if len(found)!=1:raise SystemExit('Expected exactly one connected Edge ZMK USB device. Keep slider ON.')
    return found[0]

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);args=p.parse_args()
    output=args.output.resolve()
    if output.is_relative_to(ROOT):raise SystemExit('Choose a private output outside the public repository.')
    metadata=Metadata(device());output.parent.mkdir(parents=True,exist_ok=True)
    fd=os.open(output,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    count=0
    print('Capturing Edge Studio transfer metadata only. Reproduce one failed read, then stop the capture. No key values or device addresses are saved.',flush=True)
    try:
        with os.fdopen(fd,'w',buffering=1) as log:
            for line in sys.stdin:
                for clean in metadata.feed(line):log.write(clean+'\n');count+=1
    except KeyboardInterrupt:pass
    print(f'Capture complete: {count} metadata lines.',flush=True)
if __name__=='__main__':main()
