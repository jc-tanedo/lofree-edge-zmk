// Browser-only test fixture. Staged into studio-qa; never in the production build.
import { useState } from "react";
import type {
  RpcConnection,
  Request,
  RequestResponse,
  Notification,
} from "@zmkfirmware/zmk-studio-ts-client";
import fixture from "./preview-keymap.json";
import { IDS, PRINTED_KEYS } from "./edge-export/studio-actions.js";
let notify: ReadableStreamDefaultController<Notification> | undefined,
  locked = true,
  rejectKey = false,
  rejectSave = false,
  failRead = false;
let pauseReads = false, pausePower=false, failPower=false, legacyPower=false, rejectPower=false;
const pendingReads: Array<() => void> = [];
let pauseDetails = false;
const pendingDetails: Array<() => void> = [];
const clone = <T,>(v: T): T => structuredClone(v);
export function PreviewControls() {
  const [isLocked, setLocked] = useState(locked);
  const [paused, setPaused] = useState(false);
  const [pausedPower,setPausedPower]=useState(false);
  const [detailsPaused,setDetailsPaused]=useState(false);
  const [legacy,setLegacy]=useState(false);
  return (
    <div
      className="edge-preview-banner"
      style={{
        position: "relative",
        zIndex: 100,
        padding: "10px 25px",
        background: "#f7e6a7",
        color: "#665015",
        fontSize: 12,
        display: "flex",
        gap: 20,
        alignItems: "center",
      }}
    >
      <button onClick={() => {
        pauseReads = !pauseReads;
        setPaused(pauseReads);
        if (!pauseReads) pendingReads.splice(0).forEach(reply => reply());
      }}>{paused ? "Resume mapping reads" : "Pause mapping reads"}</button>
      <button onClick={() => { pauseDetails=!pauseDetails;setDetailsPaused(pauseDetails);if(!pauseDetails)pendingDetails.splice(0).forEach(reply=>reply()); }}>{detailsPaused ? "Resume action reads" : "Pause action reads"}</button>
      <button onClick={() => pendingDetails.shift()?.()}>Read next action</button>
      <button onClick={() => { failRead = true; }}>Fail next mapping read</button>
      <button onClick={()=>{pausePower=!pausePower;setPausedPower(pausePower);if(!pausePower)pendingReads.splice(0).forEach(reply=>reply());}}>{pausedPower ? "Resume power reads" : "Pause power reads"}</button>
      <button onClick={()=>{failPower=true;}}>Fail next power read</button>
      <button onClick={()=>{legacyPower=!legacyPower;setLegacy(legacyPower);}}>{legacy ? "Enable power support" : "Simulate old firmware"}</button>
      <button onClick={()=>{rejectPower=true;}}>Reject next power save</button>
      <strong>UI PREVIEW — no keyboard connection</strong>
      <button
        onClick={() => {
          locked = !locked;
          setLocked(locked);
          notify?.enqueue({ core: { lockStateChanged: locked ? 0 : 1 } });
        }}
      >
        {isLocked ? "Unlock preview" : "Lock preview"}
      </button>
      <button
        onClick={() => {
          rejectKey = true;
        }}
      >
        Reject next assignment
      </button>
      <button
        onClick={() => {
          rejectSave = true;
        }}
      >
        Reject next save
      </button>
    </div>
  );
}
export function create_rpc_connection({ signal }: { signal?: AbortSignal } = {}): RpcConnection {
  let map = { ...clone(fixture), maxLayerNameLength: 20 },
    saved = clone(map),
    dirty = false;
  const names = [
    "key_press",
    "momentary_layer",
    "toggle_layer",
    "to_layer",
    "transparent",
    "none",
    "bcklight",
    "studio_unlock",
    "prev_firmware",
    "bluetooth",
    "outputs",
  ];
  const details = Object.fromEntries(
    names.map((name) => {
      const id = IDS[name];
      let metadata: any[] = [];
      if (name === "key_press")
        metadata = [
          {
            param1: [{ hidUsage: { keyboardMax: 231, consumerMax: 4095 } }],
            param2: [{ nil: {} }],
          },
        ];
      if (name.endsWith("_layer"))
        metadata = [{ param1: [{ layerId: {} }], param2: [{ nil: {} }] }];
      if (name === "bcklight")
        metadata = [
          { param1: [{ range: { min: 0, max: 5 } }], param2: [{ nil: {} }] },
          {
            param1: [{ constant: 6 }],
            param2: [{ range: { min: 0, max: 100 } }],
          },
        ];
      if (name === "bluetooth") metadata = [{param1:[{constant:3}],param2:[{range:{min:0,max:3}}]}];
      if (name === "outputs") metadata = [{param1:[{range:{min:0,max:3}}],param2:[{nil:{}}]}];
      return [id, { id, displayName: name === "outputs" ? "Output Selection (ignored; use physical switch)" : name, metadata }];
    }),
  );
  let responses: ReadableStreamDefaultController<RequestResponse>;
  const dirtyNotice = () =>
    notify?.enqueue({ keymap: { unsavedChangesStatusChanged: dirty } });
  let security={schema:1,requireUnlock:1,status:0};
  let power={schema:1,dimSeconds:30,offSeconds:120,sleepSeconds:900,dimPercent:20,capabilities:7,status:0};
  function handle(r: Request): any {
    const core=r.core as typeof r.core & {edgeGetPower?:boolean;edgeSetPower?:typeof power;edgeGetSecurity?:boolean;edgeSetSecurity?:typeof security};
    if(core?.edgeGetSecurity) {
      if(legacyPower)return {meta:{simpleError:2}};
      if(locked)return {meta:{simpleError:1}};
      return {core:{edgeSecurity:clone(security)}};
    }
    if(core?.edgeSetSecurity) {
      if(locked)return {meta:{simpleError:1}};
      security={...core.edgeSetSecurity,status:0};
      locked=!!security.requireUnlock;
      notify?.enqueue({core:{lockStateChanged:locked ? 0 : 1}});
      return {core:{edgeSecurity:clone(security)}};
    }
    if(core?.edgeGetPower) {
      if(legacyPower)return {meta:{simpleError:2}};
      if(failPower){failPower=false;return {core:{edgePower:{...power,dimSeconds:86401}}};}
      return {core:{edgePower:clone(power)}};
    }
    if(core?.edgeSetPower) {
      if(rejectPower){rejectPower=false;return {core:{edgePower:{...power,status:2}}};}
      if(locked)return {meta:{simpleError:1}};
      power={...core.edgeSetPower,capabilities:7,status:0};
      return {core:{edgePower:clone(power)}};
    }
    if (r.core?.getDeviceInfo)
      return { core: { getDeviceInfo: { name: "Lofree Edge ZMK" } } };
    if (r.core?.getLockState) return { core: { getLockState: locked ? 0 : 1 } };
    if (r.core?.resetSettings) {
      map = { ...clone(fixture), maxLayerNameLength: 20 };
      saved = clone(map);
      dirty = false;
      dirtyNotice();
      return { core: { resetSettings: true } };
    }
    if (r.behaviors?.listAllBehaviors)
      return {
        behaviors: {
          listAllBehaviors: { behaviors: Object.keys(details).map(Number) },
        },
      };
    if (r.behaviors?.getBehaviorDetails)
      return {
        behaviors: {
          getBehaviorDetails:
            details[r.behaviors.getBehaviorDetails.behaviorId],
        },
      };
    const [cmd, v] = Object.entries(r.keymap || {})[0] || [];
    let response: any;
    if (cmd === "getPhysicalLayouts")
      return {
        keymap: {
          getPhysicalLayouts: {
            activeLayoutIndex: 0,
            layouts: [
              {
                name: "Lofree Edge",
                keys: PRINTED_KEYS.map((k) => ({
                  x: Math.round((k.x / 26) * 100),
                  y: Math.round((k.y / 26) * 100),
                  width: Math.round((k.width / 26) * 100),
                  height: Math.round((k.height / 26) * 100),
                })),
              },
            ],
          },
        },
      };
    if (cmd === "getKeymap" && failRead) {
      failRead = false;
      return { meta: { noResponse: true } };
    }
    if (cmd === "getKeymap") return { keymap: { getKeymap: clone(map) } };
    if (cmd === "checkUnsavedChanges")
      return { keymap: { checkUnsavedChanges: dirty } };
    if (cmd === "saveChanges") {
      if (rejectSave) {
        rejectSave = false,
  failRead = false;
        return { keymap: { saveChanges: { err: 0 } } };
      }
      saved = clone(map);
      dirty = false;
      response = { ok: true };
    } else if (cmd === "discardChanges") {
      map = clone(saved);
      dirty = false;
      response = true;
    } else if (cmd === "setLayerBinding") {
      if (rejectKey) {
        rejectKey = false;
        return { keymap: { setLayerBinding: 2 } };
      }
      map.layers.find((l) => l.id === v.layerId)!.bindings[v.keyPosition] =
        clone(v.binding);
      dirty = true;
      response = 0;
    } else if (cmd === "setLayerProps") {
      map.layers.find((l) => l.id === v.layerId)!.name = v.name;
      dirty = true;
      response = 0;
    } else if (cmd === "addLayer") {
      const id = [0, 1, 2].find((n) => !map.layers.some((l) => l.id === n))!;
      const layer = {
        id,
        name: "Layer " + (map.layers.length + 1),
        bindings: Array.from({ length: 84 }, () => ({
          behaviorId: IDS.transparent,
          param1: 0,
          param2: 0,
        })),
      };
      map.layers.push(layer);
      map.availableLayers--;
      dirty = true;
      response = { ok: { index: map.layers.length - 1, layer: clone(layer) } };
    } else if (cmd === "removeLayer") {
      map.layers.splice(v.layerIndex, 1);
      map.availableLayers++;
      dirty = true;
      response = { ok: {} };
    } else if (cmd === "moveLayer") {
      const [l] = map.layers.splice(v.startIndex, 1);
      map.layers.splice(v.destIndex, 0, l);
      dirty = true;
      response = { ok: clone(map) };
    } else if (cmd === "setActivePhysicalLayout") response = { ok: clone(map) };
    else throw Error("Unhandled preview request " + cmd);
    dirtyNotice();
    return { keymap: { [cmd]: response } };
  }
  return {
    label: "UI preview",
    current_request: 0,
    request_response_readable: new ReadableStream({
      start(c) {
        responses = c;
        signal?.addEventListener("abort", () => {
          pendingReads.splice(0);
          pendingDetails.splice(0);
          responses.error(new Error("Preview connection closed"));
        }, { once: true });
      },
    }),
    notification_readable: new ReadableStream({
      start(c) {
        notify = c;
      },
    }),
    request_writable: new WritableStream({
      write(r) {
        const reply = () => responses.enqueue({ requestId: r.requestId, ...handle(r) });
        if ((pauseReads && r.keymap?.getKeymap) || (pausePower && (r.core as any)?.edgeGetPower)) pendingReads.push(reply);
        else if (pauseDetails && r.behaviors?.getBehaviorDetails) pendingDetails.push(reply);
        else reply();
      },
    }),
  };
}
