// SPDX-License-Identifier: GPL-3.0-or-later
import assert from "node:assert/strict";
import { Request, Response } from "@zmkfirmware/zmk-studio-ts-client";
import { Writer } from "protobufjs/minimal";
import { securityRpc } from "../studio-extension/edge-security-rpc";
import "../studio-extension/edge-power-rpc";
async function test() {
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
        c.enqueue({
          requestId: 0,
          core: { edgeSecurity: { schema: 1, requireUnlock: 0, status: 0 } },
        });
      },
    }),
  };
  assert.equal((await securityRpc(conn)).requireUnlock, 0);
  assert.equal(
    Buffer.from(Request.encode(sent).finish()).toString("hex"),
    "1a03900101",
  );
  for (const enabled of [0, 1]) {
    const w = Writer.create()
      .uint32(10)
      .fork()
      .uint32(26)
      .fork()
      .uint32(138)
      .fork()
      .uint32(8)
      .uint32(1)
      .uint32(16)
      .uint32(enabled);
    const response: any = Response.decode(
      w.ldelim().ldelim().ldelim().finish(),
    );
    assert.deepEqual(response.requestResponse.core.edgeSecurity, {
      schema: 1,
      requireUnlock: enabled,
      status: 0,
    });
  }
  const both: any = {
    core: { edgeSetSecurity: { schema: 1, requireUnlock: 0, status: 0 } },
  };
  assert.equal(
    Buffer.from(Request.encode(both).finish()).toString("hex"),
    "08001a059a01020801",
  );
  assert.equal(
    Response.decode(Uint8Array.from([10, 4, 26, 2, 16, 1])).requestResponse
      ?.core?.getLockState,
    1,
  );
  assert(
    Buffer.from(
      Request.encode({ core: { edgeGetPower: true } } as any).finish(),
    ).includes(Buffer.from([128, 1, 1])),
  );
  assert.throws(() =>
    Response.decode(Uint8Array.from([10, 5, 26, 3, 138, 1, 5])),
  );
  console.log(
    "PASS: security codec bool-zero persistence, additive fields, truncation, upstream lock and Power coexistence",
  );
}
void test().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
