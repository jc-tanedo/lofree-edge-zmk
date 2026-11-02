import {usbReadDiagnostics} from "./edge-usb-diagnostics";
import { useContext, useEffect, useState } from "react";
import { call_rpc } from "@zmkfirmware/zmk-studio-ts-client";
import type { Keymap, PhysicalLayout } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { ConnectionContext } from "./rpc/ConnectionContext";
import { LockStateContext } from "./rpc/LockStateContext";
import { edgeBehaviorMetadata } from "./edge-export/studio-actions.js";
import { usePub } from "./usePubSub";

export type KeymapReadProgress = { label: string; completed?: number; total?: number };

// Commit one complete read, and ignore late results after timeout/lock/disconnect.
export function useEdgeKeymapData() {
  const connection = useContext(ConnectionContext), lock = useContext(LockStateContext);
  const publish = usePub();
  const [keymap, setKeymap] = useState<Keymap>();
  const [layouts, setLayouts] = useState<PhysicalLayout[]>();
  const [selectedPhysicalLayoutIndex, setSelectedPhysicalLayoutIndex] = useState(0);
  const [behaviors, setBehaviors] = useState<Record<number, GetBehaviorDetailsResponse>>({});
  const [loadingError, setLoadingError] = useState("");
  const [readProgress, setReadProgress] = useState<KeymapReadProgress>();
  useEffect(() => {
    let active = true;
    setKeymap(undefined); setLayouts(undefined); setBehaviors({}); setLoadingError(""); setReadProgress(undefined);
    const conn = connection.conn;
    if (!conn || lock !== LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED) return;
    setReadProgress({ label: "Reading key mappings…" });
    void publish("edge.keymap.read-state", "loading");
    let phase = "key mappings", lastProgressAt = Date.now();
    const readStartedAt = lastProgressAt;
    const markPhase = (label: string) => { phase = label; lastProgressAt = Date.now(); };
    const timer = window.setTimeout(() => {
      active = false;
      void publish("edge.keymap.read-state", "error");
      setLoadingError(`Reading the keyboard timed out while reading ${phase}. Last read progress was ${((Date.now() - lastProgressAt) / 1000).toFixed(1)} seconds ago (${((Date.now() - readStartedAt) / 1000).toFixed(1)} seconds total). Check the USB connection, then retry. ${usbReadDiagnostics()}`);
    }, 15000);
    async function read() {
      try {
        const map = (await call_rpc(conn!, { keymap: { getKeymap: true } })).keymap?.getKeymap;
        if (!active) return;
        if (!map?.layers?.length || map.layers.some(layer => !layer.bindings?.length)) throw new Error("The keyboard returned an incomplete keymap.");
        markPhase("the physical layout");
        setReadProgress({ label: "Reading the physical layout…" });
        const layout = (await call_rpc(conn!, { keymap: { getPhysicalLayouts: true } })).keymap?.getPhysicalLayouts;
        if (!active) return;
        const index = layout?.activeLayoutIndex || 0;
        if (!layout?.layouts?.[index]?.keys?.length) throw new Error("The keyboard did not return its physical layout.");
        if (map.layers.some(layer => layer.bindings.length !== layout.layouts[index].keys.length)) throw new Error("The keyboard returned an incomplete keymap.");
        markPhase("the supported action list");
        setReadProgress({ label: "Reading the supported action list…" });
        const ids = (await call_rpc(conn!, { behaviors: { listAllBehaviors: true } })).behaviors?.listAllBehaviors?.behaviors;
        if (!active) return;
        if (!ids?.length) throw new Error("The keyboard did not return its supported actions.");
        const details: Record<number, GetBehaviorDetailsResponse> = {};
        const total = 3 + ids.length;
        let completed = 3;
        setReadProgress({ label: `Reading supported actions · 0 of ${ids.length}`, completed, total });
        for (const behaviorId of ids) {
          markPhase(`supported actions (${completed - 3} of ${ids.length} complete)`);
          const result = (await call_rpc(conn!, { behaviors: { getBehaviorDetails: { behaviorId } } })).behaviors?.getBehaviorDetails;
          if (!active) return;
          if (!result || result.id !== behaviorId) throw new Error("The keyboard returned incomplete action definitions.");
          details[behaviorId] = edgeBehaviorMetadata(result);
          completed++;
          setReadProgress({ label: `Reading supported actions · ${completed - 3} of ${ids.length}`, completed, total });
        }
        window.clearTimeout(timer);
        if (!active) return;
        void publish("edge.keymap.read-state", "ready");
        setKeymap(map); setLayouts(layout.layouts); setSelectedPhysicalLayoutIndex(index); setBehaviors(details);
      } catch (error) {
        window.clearTimeout(timer);
        if (active) {
          active = false;
          void publish("edge.keymap.read-state", "error");
          setLoadingError(error instanceof Error ? error.message : "The keyboard did not reply with a valid keymap.");
        }
      }
    }
    void read();
    return () => { active = false; window.clearTimeout(timer); void publish("edge.keymap.read-state", "idle"); };
  }, [connection, lock]);
  return { keymap, setKeymap, layouts, selectedPhysicalLayoutIndex, behaviors, loadingError, readProgress,
    retry: () => publish("edge.keymap.retry", true) };
}
