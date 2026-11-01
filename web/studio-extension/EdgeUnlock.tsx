import { useContext, useEffect } from "react";
import { LockKeyhole } from "lucide-react";
import { ConnectionContext } from "./rpc/ConnectionContext";
import { LockStateContext } from "./rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
export function UnlockModal() {
  const c = useContext(ConnectionContext),
    l = useContext(LockStateContext);
  const locked = !!c.conn && l !== LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED;
  useEffect(() => {
    const workspace = document.querySelector<HTMLElement>(".edge-studio");
    if (workspace) workspace.inert = locked;
    if (locked) {
      // Native modal dialogs occupy a top layer above CSS overlays.
      document.querySelectorAll<HTMLDialogElement>("dialog[open]").forEach(dialog => dialog.close());
    }
    return () => { if (workspace) workspace.inert = false; };
  }, [locked]);
  return locked ? (
    <div className="edge-lock-overlay">
      <section className="edge-lock-card" role="status" aria-labelledby="edge-lock-title">
        <LockKeyhole size={28} aria-hidden="true" />
        <p className="edge-eyebrow">READ ONLY</p>
        <h2 id="edge-lock-title">Unlock your keyboard</h2>
        <p>Press <kbd>Fn</kbd> + <kbd>U</kbd> on your keyboard to enable editing.</p>
        <p className="edge-lock-note">If you remapped this shortcut, use your Studio Unlock key.</p>
      </section>
    </div>
  ) : null;
}
