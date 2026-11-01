// SPDX-License-Identifier: GPL-3.0-or-later
// Register additive project fields on the pinned codec objects used by the
// existing Studio connection. No second transport, reader, or RPC mutex.
import { Reader } from "protobufjs/minimal";
import {
  Request as CoreRequest,
  Response as CoreResponse,
} from "@zmkfirmware/zmk-studio-ts-client/core";
import type { Request, Response } from "@zmkfirmware/zmk-studio-ts-client/core";
import { call_rpc } from "@zmkfirmware/zmk-studio-ts-client";
export type Power = {
  schema: number;
  dimSeconds: number;
  offSeconds: number;
  sleepSeconds: number;
  dimPercent: number;
  capabilities: number;
  status: number;
};
const names = [
  "schema",
  "dimSeconds",
  "offSeconds",
  "sleepSeconds",
  "dimPercent",
  "capabilities",
  "status",
] as const;
type PowerRequest = Request & { edgeGetPower?: boolean; edgeSetPower?: Power };
type PowerResponse = Response & { edgePower?: Power };
const encode = CoreRequest.encode;
CoreRequest.encode = (message: PowerRequest, writer) => {
  const out = encode(message, writer);
  if (message.edgeGetPower !== undefined)
    out.uint32(128).bool(message.edgeGetPower);
  if (message.edgeSetPower) {
    out.uint32(138).fork();
    for (const [i, name] of names.entries())
      if (message.edgeSetPower[name])
        out.uint32((i + 1) * 8).uint32(message.edgeSetPower[name]);
    out.ldelim();
  }
  return out;
};
const decode = CoreResponse.decode;
CoreResponse.decode = (input, length): PowerResponse => {
  const r = input instanceof Reader ? input : Reader.create(input);
  const start = r.pos,
    end = length === undefined ? r.len : r.pos + length;
  const result: PowerResponse = decode(r, length);
  const extra = Reader.create(r.buf.subarray(start, end));
  while (extra.pos < extra.len) {
    const tag = extra.uint32();
    if (tag === 130) {
      const n = extra.uint32(),
        stop = extra.pos + n;
      if (stop > extra.len) throw new Error("Truncated power settings");
      const p: Power = {
        schema: 0,
        dimSeconds: 0,
        offSeconds: 0,
        sleepSeconds: 0,
        dimPercent: 0,
        capabilities: 0,
        status: 0,
      };
      while (extra.pos < stop) {
        const field = extra.uint32(),
          name = names[(field >>> 3) - 1];
        if (name && (field & 7) === 0) p[name] = extra.uint32();
        else extra.skipType(field & 7);
      }
      if (extra.pos !== stop) throw new Error("Invalid power settings");
      result.edgePower = p;
    } else extra.skipType(tag & 7);
  }
  return result;
};
export function validPower(p: Power) {
  const timers = [p.dimSeconds, p.offSeconds, p.sleepSeconds].filter(
    (v) => v !== 0,
  );
  return (
    p.schema === 1 &&
    [p.dimSeconds, p.offSeconds, p.sleepSeconds, p.dimPercent].every(
      Number.isInteger,
    ) &&
    timers.every((v) => v >= 1 && v <= 86400) &&
    p.dimPercent >= 0 &&
    p.dimPercent <= 100 &&
    timers.every((v, i) => !i || timers[i - 1] <= v)
  );
}
export async function powerRpc(
  conn: Parameters<typeof call_rpc>[0],
  settings?: Power,
) {
  const core: PowerRequest = settings
    ? { edgeSetPower: { ...settings, capabilities: 0, status: 0 } }
    : { edgeGetPower: true };
  const response = await call_rpc(conn, { core });
  const p = (response.core as PowerResponse | undefined)?.edgePower;
  if (!p) throw new Error("UNSUPPORTED");
  if (p.schema !== 1)
    throw new Error(
      "This firmware uses an unsupported power settings version.",
    );
  if (p.status === 3)
    throw new Error(
      "Newer settings are stored on this keyboard. Upgrade the firmware before editing them.",
    );
  if (p.status)
    throw new Error(
      p.status === 1
        ? "The keyboard rejected these values."
        : "The keyboard could not save power settings. Retry after reconnecting.",
    );
  if (!validPower(p) || !(p.capabilities & 1))
    throw new Error("The keyboard returned invalid power settings.");
  return p;
}
