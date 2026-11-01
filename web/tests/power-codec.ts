// SPDX-License-Identifier: GPL-3.0-or-later
import assert from "node:assert/strict";
import { Request, Response } from "@zmkfirmware/zmk-studio-ts-client";
import { powerRpc, validPower } from "../studio-extension/edge-power-rpc";
import { Writer } from "protobufjs/minimal";
const p = {
  schema: 1,
  dimSeconds: 30,
  offSeconds: 120,
  sleepSeconds: 900,
  dimPercent: 20,
  capabilities: 7,
  status: 0,
};
assert(validPower(p));
assert(!validPower({ ...p, offSeconds: 10 }));
assert(validPower({ ...p, dimSeconds: 0, offSeconds: 0, sleepSeconds: 0 }));
assert(!validPower({ ...p, sleepSeconds: 86401 }));
assert(!validPower({ ...p, dimPercent: NaN }));
let sent: any;
const conn: any = {
  current_request: 0,
  request_writable: new WritableStream({
    write(r) {
      sent = r;
    },
  }),
  request_response_readable: new ReadableStream({
    start(c) {
      c.enqueue({ requestId: 0, core: { edgePower: p } });
    },
  }),
};
void powerRpc(conn)
  .then((v) => {
    assert.equal(v.sleepSeconds, 900);
    const bytes = Request.encode(sent).finish();
    assert.equal(Buffer.from(bytes).toString("hex"), "1a03800101");
    const w = Writer.create();
    w.uint32(10)
      .fork()
      .uint32(8)
      .uint32(0)
      .uint32(26)
      .fork()
      .uint32(130)
      .fork();
    [1, 30, 120, 900, 20, 7, 0].forEach((v, i) => {
      if (v) w.uint32((i + 1) * 8).uint32(v);
    });
    const response: any = Response.decode(
      w.ldelim().ldelim().ldelim().finish(),
    );
    assert.deepEqual(response.requestResponse.core.edgePower, p);
    // Unrelated upstream responses continue to decode normally.
    const legacy = Response.decode(Uint8Array.from([10, 4, 26, 2, 16, 1]));
    assert.equal(legacy.requestResponse?.core?.getLockState, 1);
    const sentSet: any = {
      core: { edgeSetPower: { ...p, capabilities: 0, status: 0 } },
    };
    const encodedSet = Request.encode(sentSet).finish();
    assert(
      Buffer.from(encodedSet).includes(Buffer.from([138, 1])),
      "Missing setter field17",
    );
    console.log(
      "PASS: actual shared Studio codec, power request/response, old fields and timer validation",
    );
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
