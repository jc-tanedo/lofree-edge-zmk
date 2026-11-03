# SPDX-License-Identifier: GPL-3.0-or-later
"""Linux read-only Studio probe. Disconnect browser Studio before running.
No settings/keymap writes, flash, acceptance, reset or lock operations are allowed.
Only protocol timing/counts are logged, never mapping values or device identities.
"""
import argparse
import fcntl
import json
import os
from pathlib import Path
import select
import struct
import subprocess
import sys
import termios
import time
ROOT=Path(__file__).resolve().parents[1]
ALLOWED={'core.get_device_info','core.get_lock_state','keymap.get_keymap','keymap.get_physical_layouts','behaviors.list_all_behaviors','behaviors.get_behavior_details'}

def chunks(payload,mode):
    parts=[bytes([0xab])];start=0
    for i,b in enumerate(payload):
        if b in (0xab,0xac,0xad):parts.extend([payload[start:i],bytes([0xac])]);start=i
    if start<len(payload):parts.append(payload[start:])
    parts.append(bytes([0xad]));parts=[p for p in parts if p]
    return [b''.join(parts)] if mode=='coalesced' else parts

def stream_fnv(seed,data):
    for byte in data:seed=((seed^byte)*16777619)&0xffffffff
    return seed

class Frames:
    def __init__(self):self.frame=None;self.escaped=False
    def feed(self,data):
        result=[]
        for b in data:
            if self.frame is None:
                if b==0xab:self.frame=bytearray();self.escaped=False
            elif self.escaped:self.frame.append(b);self.escaped=False
            elif b==0xac:self.escaped=True
            elif b==0xab:self.frame=bytearray()
            elif b==0xad:result.append(bytes(self.frame));self.frame=None
            else:self.frame.append(b)
            if self.frame is not None and len(self.frame)>65536:raise RuntimeError('Response exceeds frame limit')
        return result

def choose_port():
    ports=[]
    for tty in Path('/sys/class/tty').glob('ttyACM*'):
        for parent in (tty/'device').resolve().parents:
            try:
                if (parent/'idVendor').read_text().strip()=='1d50' and (parent/'idProduct').read_text().strip()=='615e':ports.append('/dev/'+tty.name);break
            except OSError:pass
    if len(ports)!=1:raise RuntimeError('Expected exactly one wired Edge ZMK serial port')
    return ports[0]

class Port:
    def __init__(self,path):
        self.fd=os.open(path,os.O_RDWR|os.O_NOCTTY|os.O_NONBLOCK);self.original=None
        try:
            fcntl.flock(self.fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
            fcntl.ioctl(self.fd,0x540c) # TIOCEXCL: reject subsequent opens during this probe.
            data=bytearray(44);fcntl.ioctl(self.fd,0x802c542a,data,True) # TCGETS2
            self.original=bytes(data);fields=list(struct.unpack('=IIIIB19sII',data))
            fields[0]=fields[1]=fields[3]=0
            fields[2]=(fields[2]&~(0x100f|termios.CSIZE|termios.PARENB|termios.CSTOPB|termios.CRTSCTS))|0x1000|termios.CS8|termios.CREAD|termios.CLOCAL
            cc=bytearray(fields[5]);cc[termios.VMIN]=1;cc[termios.VTIME]=0;fields[5]=bytes(cc);fields[6]=fields[7]=12500
            fcntl.ioctl(self.fd,0x402c542b,struct.pack('=IIIIB19sII',*fields)) # TCSETS2/BOTHER
            fcntl.ioctl(self.fd,termios.TIOCMBIS,struct.pack('i',termios.TIOCM_DTR|termios.TIOCM_RTS))
        except BaseException:self.close();raise
    def close(self):
        try:
            if self.original is not None:fcntl.ioctl(self.fd,0x402c542b,self.original)
        finally:os.close(self.fd)
    def read(self,timeout):
        if not select.select([self.fd],[],[],max(timeout,0))[0]:return b''
        data=os.read(self.fd,4096)
        if not data:raise RuntimeError('Serial device disconnected')
        return data
    def write(self,data,timeout):
        deadline=time.monotonic()+timeout
        while data:
            if time.monotonic()>=deadline:raise TimeoutError('Serial write timed out')
            if not select.select([],[self.fd],[],max(deadline-time.monotonic(),0))[1]:continue
            try:n=os.write(self.fd,data)
            except BlockingIOError:continue
            data=data[n:]

def protobuf():
    generated=ROOT/'build/tmp/read-probe-proto';generated.mkdir(parents=True,exist_ok=True)
    proto=ROOT/'.deps/zmk-studio-messages/proto/zmk'
    subprocess.run(['protoc',f'--proto_path={proto}',f'--python_out={generated}',*map(str,proto.glob('*.proto'))],check=True)
    sys.path.insert(0,str(generated));import studio_pb2
    return studio_pb2

def allowed(request):
    group=request.WhichOneof('subsystem')
    operation=getattr(request,group).WhichOneof('request_type') if group else None
    name=f'{group}.{operation}'
    if name not in ALLOWED:raise ValueError('Probe rejects non-read-only RPC')
    return name

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode',choices=['fragmented','coalesced'],required=True)
    parser.add_argument('--initial-fnv',type=lambda s:int(s,0),help='Seed from a schema2 diagnostic snapshot, for byte-integrity comparison')
    parser.add_argument('--followup-after-timeout',action='store_true',help='After the first missing reply, send one read-only device-info query on the same connection')
    parser.add_argument('--only',choices=['all','action-list','device-info'],default='all')
    parser.add_argument('--cycles',type=int,default=10);parser.add_argument('--gap-ms',type=float,default=.2)
    parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    if not 1<=args.cycles<=1000 or not 0<=args.gap_ms<=10:parser.error('cycles1..1000; gap-ms0..10')
    if args.initial_fnv is not None and not 0<=args.initial_fnv<=0xffffffff:parser.error('initial-fnv must be uint32')
    output=args.output.resolve()
    if output.is_relative_to(ROOT):parser.error('Keep logs outside the public repository')
    pb=protobuf();path=choose_port();output.parent.mkdir(parents=True,exist_ok=True)
    fd=os.open(output,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'w',buffering=1) as log:
        def emit(**values):log.write(json.dumps(values)+'\n')
        port=None
        try:
            port=Port(path);deadline=time.monotonic()+1.5
            while port.read(.15):
                if time.monotonic()>deadline:raise RuntimeError('Previous serial input did not settle')
            decoder=Frames();sequence=0;followup_attempted=False;expected_fnv=args.initial_fnv
            def rpc(request):
                nonlocal sequence,followup_attempted,expected_fnv
                name=allowed(request);request.request_id=sequence;sequence+=1
                parts=chunks(request.SerializeToString(),args.mode);start=time.monotonic();received=0
                emit(event='request',id=request.request_id,operation=name,parts=[len(p) for p in parts])
                for i,part in enumerate(parts):
                    port.write(part,3)
                    if i<len(parts)-1 and args.gap_ms:time.sleep(args.gap_ms/1000)
                if expected_fnv is not None:
                    expected_fnv=stream_fnv(expected_fnv,b''.join(parts))
                emit(event='write_complete',id=request.request_id,expected_rx_fnv=expected_fnv)
                deadline=start+3
                while time.monotonic()<deadline:
                    data=port.read(deadline-time.monotonic());received+=len(data)
                    for raw in decoder.feed(data):
                        response=pb.Response();response.ParseFromString(raw)
                        if response.HasField('request_response') and response.request_response.request_id==request.request_id:
                            result=response.request_response
                            if result.WhichOneof('subsystem')=='meta':raise RuntimeError('Read rejected by firmware; check physical unlock')
                            emit(event='response',id=request.request_id,elapsed_ms=round((time.monotonic()-start)*1000,2),received_bytes=received)
                            return result
                emit(event='timeout',id=request.request_id,received_bytes=received,unfinished_bytes=len(decoder.frame) if decoder.frame is not None else None)
                if args.followup_after_timeout and not followup_attempted:
                    followup_attempted=True
                    query=pb.Request();query.core.get_device_info=True
                    try:rpc(query);emit(event='followup_reply_received')
                    except Exception:emit(event='followup_no_reply')
                raise TimeoutError('Read received no complete matching response')
            def read(group,operation):
                request=pb.Request();setattr(getattr(request,group),operation,True);return rpc(request)
            read('core','get_device_info')
            if read('core','get_lock_state').core.get_lock_state!=1:raise RuntimeError('Studio is locked; physical Fn+U is required')
            for cycle in range(args.cycles):
                if args.only=='device-info':read('core','get_device_info')
                elif args.only=='action-list':read('behaviors','list_all_behaviors')
                else:
                    read('keymap','get_keymap');read('keymap','get_physical_layouts')
                    ids=read('behaviors','list_all_behaviors').behaviors.list_all_behaviors.behaviors
                    if not ids:raise RuntimeError('Empty action list')
                    for behavior in ids:
                        request=pb.Request();request.behaviors.get_behavior_details.behavior_id=behavior
                        if rpc(request).behaviors.get_behavior_details.id!=behavior:raise RuntimeError('Action response mismatch')
                emit(event='cycle_complete',cycle=cycle+1)
                if args.only=='all' or (cycle+1)%25==0:print(f'{args.mode}: {args.only} cycle{cycle+1}/{args.cycles} passed',flush=True)
            emit(event='passed',cycles=args.cycles)
        except Exception as error:
            emit(event='failed',error=type(error).__name__)
            print(f'{args.mode}: {type(error).__name__}: {error}',flush=True);return 1
        finally:
            if port is not None:port.close()
    return 0
if __name__=='__main__':raise SystemExit(main())
