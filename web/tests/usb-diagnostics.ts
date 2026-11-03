// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict';
import {Request,Response} from '@zmkfirmware/zmk-studio-ts-client';
import {createDiagnostics} from '../studio-extension/edge-usb-diagnostics';
function frame(bytes:Uint8Array){const result=[0xab];for(const b of bytes){if([0xab,0xac,0xad].includes(b))result.push(0xac);result.push(b);}return new Uint8Array([...result,0xad]);}
const d=createDiagnostics();
d.write(frame(Request.encode(Request.fromPartial({requestId:10,behaviors:{getBehaviorDetails:{behaviorId:123}}})).finish()));d.written();
assert.match(d.summary(),/0 since last request.*unfinished response none/);
const response=frame(Response.encode(Response.fromPartial({requestResponse:{requestId:10,core:{getDeviceInfo:{name:'PRIVATE_FIXTURE_NAME'}}}})).finish());
d.read(response.subarray(0,8));
assert.match(d.summary(),/8 since last request.*unfinished response [1-9][0-9]* payload bytes/);
assert.match(d.summary(),/last response none/);
d.read(response.subarray(8));
assert.match(d.summary(),/last response core.getDeviceInfo #10/);assert.match(d.summary(),/unfinished response none/);
assert(!d.summary().includes('PRIVATE_FIXTURE_NAME'));
// Snapshot accounting resets for a new request; totals remain cumulative.
d.write(frame(Request.encode(Request.fromPartial({requestId:11,keymap:{getKeymap:true}})).finish()));d.written();
assert.match(d.summary(),/0 since last request/);
console.log('PASS: diagnostics distinguish no reply, partial frame and complete reply without payload values');
