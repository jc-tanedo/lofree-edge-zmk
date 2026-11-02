import { createElement, useContext, useState, useEffect, useRef } from "react";
import {
  Usb,
  Undo2,
  Redo2,
  Save,
  ChevronDown,
  Check,
  Circle,
  Folder,
  X,
  LockKeyhole,
} from "lucide-react";
import { useConnectedDeviceData } from "./rpc/useConnectedDeviceData";
import { useSub, usePub } from "./usePubSub";
import { ConnectionContext } from "./rpc/ConnectionContext";
import { LockStateContext } from "./rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { KeymapExport } from "./KeymapExport";
import { KeymapImport } from "./KeymapImport";
import type { AppHeaderProps } from "./EdgeHeaderTypes";
export function AppHeader(p: AppHeaderProps) {
  const connection = useContext(ConnectionContext),
    lock = useContext(LockStateContext);
  const [unsaved, setUnsaved] = useConnectedDeviceData<boolean>(
    { keymap: { checkUnsavedChanges: true } },
    (r) => r.keymap?.checkUnsavedChanges,
  );
  useSub("rpc_notification.keymap.unsavedChangesStatusChanged", (v) =>
    setUnsaved(v),
  );
  const [securityDirty,setSecurityDirty] = useState(false);
  useSub("edge.security.dirty",setSecurityDirty);
  const [powerDirty,setPowerDirty] = useState(false);
  useSub("edge.power.dirty",setPowerDirty);
  useEffect(() => {
    document.dispatchEvent(new CustomEvent("edge-unsaved-changes", { detail: !!unsaved || powerDirty || securityDirty }));
    return () => { document.dispatchEvent(new CustomEvent("edge-unsaved-changes", { detail: false })); };
  }, [unsaved,powerDirty,securityDirty]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reset, setReset] = useState(false),
    [discard, setDiscard] = useState(false);
  const [readState, setReadState] = useState("idle");
  useSub("edge.keymap.read-state", setReadState);
  const reading = readState === "loading" || readState === "error";
  const [editing, setEditing] = useState(false);
  useSub("edge.ui.busy", setEditing);
  const publish = usePub(),
    confirm = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (reset || discard) confirm.current?.showModal();
    else confirm.current?.close();
  }, [reset, discard]);
  useEffect(() => {
    if (
      !connection.conn ||
      lock !== LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED
    ) {
      setReset(false);
      setDiscard(false);
    }
  }, [connection, lock]);
  useEffect(() => {
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (
        event.target instanceof Element &&
        event.target.closest(".edge-files-menu,.edge-device-menu") &&
        event.type === "mousedown"
      )
        return;
      document
        .querySelectorAll<HTMLDetailsElement>(
          ".edge-files-menu[open],.edge-device-menu[open]",
        )
        .forEach((menu) => {
          menu.open = false;
        });
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  const ready =
    !!connection.conn &&
    lock === LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED &&
    !busy &&
    !editing && !reading;
  async function run(fn: (() => unknown) | undefined) {
    setBusy(true);
    setError("");
    try {
      await publish("edge.ui.busy", true);
      await fn?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      await publish("edge.ui.busy", false);
    }
  }
  return (
    <>
      <header className="edge-header">
        {createElement("edge-navigation", { active: "studio" })}
        <div className="edge-device">
          <Usb size={15} />
          <span>{p.connectedDeviceLabel || "Lofree Edge"}</span>
          <span
            className={`edge-device-dot ${connection.conn ? "is-connected" : ""}`}
          />
          {!!connection.conn && (
            <details className="edge-device-menu">
              <summary aria-label="Device options">
                <ChevronDown size={14} />
              </summary>
              <div className="edge-menu-panel">
                <button
                  disabled={busy}
                  onClick={() => void run(p.onDisconnect)}
                >
                  Disconnect
                </button>
                <button
                  className="edge-danger-text"
                  disabled={!ready}
                  onClick={() => setReset(true)}
                >
                  Restore default keymap…
                </button>
              </div>
            </details>
          )}
        </div>
        <div className="edge-header-actions">
          <span className="edge-save-status">
            {!connection.conn ? (
              "Not connected"
            ) : lock !== LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED ? (
              <>
                <LockKeyhole size={13} />
                Locked
              </>
            ) : readState === "loading" ? "Reading keymap…" : readState === "error" ? "Keymap unavailable" : securityDirty ? "Unsaved security settings" : powerDirty ? "Unsaved power settings" : unsaved ? (
              <>
                <Circle size={8} />
                Unsaved changes
              </>
            ) : (
              <>
                <Check size={14} />
                All changes saved
              </>
            )}
          </span>
          <button
            className="edge-icon-button"
            aria-label="Undo"
            title="Undo"
            disabled={!ready || !p.canUndo}
            onClick={() => void run(p.onUndo)}
          >
            <Undo2 size={17} />
          </button>
          <button
            className="edge-icon-button"
            aria-label="Redo"
            title="Redo"
            disabled={!ready || !p.canRedo}
            onClick={() => void run(p.onRedo)}
          >
            <Redo2 size={17} />
          </button>
          <button
            className="edge-button edge-button-primary edge-save-button"
            disabled={!ready || !unsaved}
            onClick={() => void run(p.onSave)}
          >
            <Save size={15} />
            {busy ? "Working…" : "Save"}
          </button>
          <details className="edge-files-menu">
            <summary>
              <Folder size={16} />
              Files
              <ChevronDown size={13} />
            </summary>
            <div className="edge-menu-panel">
              <p>KEYMAP FILES</p>
              <fieldset disabled={busy || editing || reading}>
                <KeymapImport />
                <KeymapExport />
              </fieldset>
              <hr />
              <a
                href={new URL("../#firmware-title", window.location.href).href}
              >
                Install firmware →
              </a>
              <button
                disabled={!ready || !unsaved}
                onClick={() => setDiscard(true)}
              >
                Discard unsaved changes…
              </button>
            </div>
          </details>
        </div>
      </header>
      {error && (
        <div className="edge-header-error" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <dialog
        ref={confirm}
        className="edge-dialog"
        aria-labelledby="edge-confirm-heading"
        onCancel={() => {
          setReset(false);
          setDiscard(false);
        }}
        onClose={() => {
          setReset(false);
          setDiscard(false);
        }}
      >
        <div className="edge-dialog-heading">
          <h2 id="edge-confirm-heading">
            {reset ? "Restore default keymap?" : "Discard unsaved changes?"}
          </h2>
        </div>
        <p>
          {reset
            ? "This removes your saved key and layer customizations and restores the firmware’s default keymap. Export a backup first if you want to restore your current settings later."
            : "All changes since your last save will be lost. Your saved keymap will be loaded from the keyboard."}
        </p>
        <div className="edge-dialog-actions">
          <button
            autoFocus
            className="edge-button"
            onClick={() => {
              setReset(false);
              setDiscard(false);
            }}
          >
            Cancel
          </button>
          <button
            className="edge-button edge-button-danger"
            disabled={!ready}
            onClick={() => {
              const action = reset ? p.onResetSettings : p.onDiscard;
              setReset(false);
              setDiscard(false);
              void run(action);
            }}
          >
            {reset ? "Restore defaults" : "Discard changes"}
          </button>
        </div>
      </dialog>
    </>
  );
}
