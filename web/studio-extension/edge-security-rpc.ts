// SPDX-License-Identifier: GPL-3.0-or-later
// Additive fields on the existing shared codec and transport, like Edge Power.
import { Reader } from "protobufjs/minimal";
import {
  Request as CoreRequest,
  Response as CoreResponse,
} from "@zmkfirmware/zmk-studio-ts-client/core";
import type { Request, Response } from "@zmkfirmware/zmk-studio-ts-client/core";
import { call_rpc } from "@zmkfirmware/zmk-studio-ts-client";
export type Security = {
  schema: number;
  requireUnlock: number;
  status: number;
};
type SecurityRequest = Request & {
  edgeGetSecurity?: boolean;
  edgeSetSecurity?: Security;
};
type SecurityResponse = Response & { edgeSecurity?: Security };
const names = ["schema", "requireUnlock", "status"] as const;
const encode = CoreRequest.encode;
CoreRequest.encode = (message: SecurityRequest, writer) => {
  const out = encode(message, writer);
  if (message.edgeGetSecurity !== undefined)
    out.uint32(144).bool(message.edgeGetSecurity);
  if (message.edgeSetSecurity) {
    out.uint32(154).fork();
    names.forEach((name, i) => {
      if (message.edgeSetSecurity![name])
        out.uint32((i + 1) * 8).uint32(message.edgeSetSecurity![name]);
    });
    out.ldelim();
  }
  return out;
};
const decode = CoreResponse.decode;
CoreResponse.decode = (input, length): SecurityResponse => {
  const reader = input instanceof Reader ? input : Reader.create(input);
  const start = reader.pos,
    end = length === undefined ? reader.len : start + length;
  const result: SecurityResponse = decode(reader, length);
  const extra = Reader.create(reader.buf.subarray(start, end));
  while (extra.pos < extra.len) {
    const tag = extra.uint32();
    if (tag !== 138) {
      extra.skipType(tag & 7);
      continue;
    }
    const size = extra.uint32(),
      stop = extra.pos + size;
    if (stop > extra.len) throw new Error("Truncated security settings.");
    const value: Security = { schema: 0, requireUnlock: 0, status: 0 };
    while (extra.pos < stop) {
      const field = extra.uint32(),
        name = names[(field >>> 3) - 1];
      if (name && (field & 7) === 0) value[name] = extra.uint32();
      else extra.skipType(field & 7);
    }
    if (extra.pos !== stop) throw new Error("Invalid security settings.");
    result.edgeSecurity = value;
  }
  return result;
};
export async function securityRpc(
  conn: Parameters<typeof call_rpc>[0],
  requireUnlock?: boolean,
) {
  const core: SecurityRequest =
    requireUnlock === undefined
      ? { edgeGetSecurity: true }
      : {
          edgeSetSecurity: {
            schema: 1,
            requireUnlock: requireUnlock ? 1 : 0,
            status: 0,
          },
        };
  const response = await call_rpc(conn, { core });
  const value = (response.core as SecurityResponse | undefined)?.edgeSecurity;
  if (!value) throw new Error("UNSUPPORTED");
  if (value.schema !== 1 || value.status === 3)
    throw new Error(
      "Unsupported security settings version. Upgrade firmware before editing.",
    );
  if (value.status)
    throw new Error(
      value.status === 1
        ? "The keyboard rejected these settings."
        : "Could not save security settings. Reconnect and read again.",
    );
  if (value.requireUnlock !== 0 && value.requireUnlock !== 1)
    throw new Error("Invalid security settings from keyboard.");
  if (requireUnlock !== undefined && !!value.requireUnlock !== requireUnlock)
    throw new Error(
      "Security settings did not match the requested value. Reconnect and read again.",
    );
  return value;
}
