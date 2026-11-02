// SPDX-License-Identifier: GPL-3.0-or-later
import { useContext, useEffect, useRef, useState } from "react";
import { NoResponseError, MetaError } from "@zmkfirmware/zmk-studio-ts-client";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { ConnectionContext } from "./rpc/ConnectionContext";
import { LockStateContext } from "./rpc/LockStateContext";
import { useConnectedDeviceData } from "./rpc/useConnectedDeviceData";
import { securityRpc } from "./edge-security-rpc";
import { usePub, useSub } from "./usePubSub";

export function EdgeSecurity({
  ready,
  busy,
  hasUnlock,
}: {
  ready: boolean;
  busy: boolean;
  hasUnlock: boolean;
}) {
  const { conn } = useContext(ConnectionContext),
    lock = useContext(LockStateContext),
    publish = usePub();
  const [saved, setSaved] = useState<boolean>(),
    [draft, setDraft] = useState(true);
  const [state, setState] = useState("idle"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState(false);
  const generation = useRef(0),
    dialog = useRef<HTMLDialogElement>(null);
  const [unsaved, setUnsaved] = useConnectedDeviceData<boolean>(
    { keymap: { checkUnsavedChanges: true } },
    (r) => r.keymap?.checkUnsavedChanges,
    true,
  );
  useSub("rpc_notification.keymap.unsavedChangesStatusChanged", setUnsaved);
  const dirty = saved !== undefined && saved !== draft;
  useEffect(() => {
    void publish("edge.security.dirty", dirty);
    return () => {
      void publish("edge.security.dirty", false);
    };
  }, [dirty]);
  useEffect(() => {
    if (confirm) dialog.current?.showModal();
    else dialog.current?.close();
  }, [confirm]);
  useEffect(() => {
    const id = ++generation.current;
    setSaved(undefined);
    setError("");
    setNotice("");
    setConfirm(false);
    setState("idle");
    void publish("edge.security.policy", undefined);
    if (
      !ready ||
      !conn ||
      lock !== LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED
    )
      return;
    setState("loading");
    const timer = window.setTimeout(() => {
      if (id !== generation.current) return;
      generation.current++;
      setState("error");
      setError(
        "Reading security settings timed out. Reconnect before retrying.",
      );
    }, 15000);
    void securityRpc(conn)
      .then((value) => {
        if (id !== generation.current) return;
        const enabled = !!value.requireUnlock;
        setSaved(enabled);
        setDraft(enabled);
        setState("ready");
        void publish("edge.security.policy", enabled);
      })
      .catch((e) => {
        if (id !== generation.current) return;
        const unsupported =
          e?.message === "UNSUPPORTED" ||
          e instanceof NoResponseError ||
          (e instanceof MetaError && e.condition === 2);
        setState(unsupported ? "unsupported" : "error");
        setError(
          unsupported
            ? "This firmware does not support changing unlock requirements. A firmware update is needed."
            : e instanceof Error
              ? e.message
              : "Could not read security settings.",
        );
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      generation.current++;
      window.clearTimeout(timer);
    };
  }, [conn, lock, ready]);
  async function save() {
    if (
      !conn ||
      !ready ||
      busy ||
      state !== "ready" ||
      !dirty ||
      unsaved !== false
    )
      return;
    const id = generation.current,
      requested = draft;
    setConfirm(false);
    setState("saving");
    setError("");
    setNotice("");
    void publish("edge.ui.busy", true);
    const timer = window.setTimeout(() => {
      if (id !== generation.current) return;
      generation.current++;
      setState("error");
      setError(
        "Saving timed out. Reconnect to read what was stored before retrying.",
      );
      void publish("edge.ui.busy", false);
    }, 15000);
    try {
      const actual = await securityRpc(conn, requested);
      // Enabling immediately locks: the secured read must wait for physical unlock.
      if (!requested) await securityRpc(conn);
      if (id === generation.current) {
        setSaved(!!actual.requireUnlock);
        setDraft(!!actual.requireUnlock);
        setState("ready");
        setNotice(
          requested
            ? "Locking enabled. Unlock physically to continue editing."
            : "Unlock requirement disabled and saved on keyboard.",
        );
        void publish("edge.security.policy", !!actual.requireUnlock);
      }
    } catch (e) {
      if (id === generation.current) {
        setState("error");
        setError(
          e instanceof Error ? e.message : "Could not save security settings.",
        );
      }
    } finally {
      window.clearTimeout(timer);
      void publish("edge.ui.busy", false);
    }
  }
  return (
    <section
      className="edge-power-panel"
      aria-label="Security settings"
      aria-busy={state === "loading" || state === "saving"}
    >
      <div>
        <span className="edge-eyebrow">SECURITY</span>
        <h2>Studio access</h2>
        <p>
          Saved on the keyboard. Studio remains available only with the physical
          switch at ON.
        </p>
      </div>
      {state === "loading" && (
        <div className="edge-power-skeleton" role="status">
          Reading security settings…
        </div>
      )}
      {error && (
        <p role="alert" className="edge-inline-error">
          {error}
        </p>
      )}
      {state === "error" && (
        <button
          className="edge-button"
          onClick={() => publish("edge.keymap.retry", true)}
        >
          Reconnect and retry
        </button>
      )}
      {saved !== undefined && (
        <fieldset disabled={!ready || busy || state !== "ready"}>
          <label className="edge-security-toggle">
            <input
              type="checkbox"
              checked={draft}
              onChange={(e) => {
                setDraft(e.target.checked);
                setNotice("");
              }}
            />{" "}
            Require physical unlock before editing
          </label>
          <p>
            Enabled by default. Use an Unlock Studio binding (Fn+U in the
            default keymap). Studio relocks on disconnect or after 10 minutes of
            Studio inactivity.
          </p>
          <p>
            When disabled, software with access to the Studio connection can
            change mappings without a physical unlock, including after
            reconnecting or restarting the keyboard.
          </p>
          {draft && !hasUnlock && (
            <p role="alert" className="edge-inline-error">
              No Unlock Studio binding exists in the current keymap. Enabling
              locking can prevent further editing after this session locks. Add
              an accessible unlock binding first.
            </p>
          )}
          {unsaved !== false && (
            <p role="status">
              Save or discard mapping changes before changing security settings.
            </p>
          )}
          <div className="edge-dialog-actions">
            <button
              className="edge-button"
              disabled={!dirty}
              onClick={() => setDraft(saved)}
            >
              Discard
            </button>
            <button
              className="edge-button edge-button-primary"
              disabled={!dirty || unsaved !== false}
              onClick={() => setConfirm(true)}
            >
              Save security settings
            </button>
          </div>
          {notice && <p role="status">{notice}</p>}
        </fieldset>
      )}
      <dialog
        ref={dialog}
        className="edge-dialog"
        onCancel={() => setConfirm(false)}
        onClose={() => setConfirm(false)}
      >
        <div className="edge-dialog-heading">
          <h2>
            {draft ? "Require physical unlock?" : "Disable physical unlock?"}
          </h2>
        </div>
        <p>
          {draft
            ? "This session will lock immediately. Use an accessible Unlock Studio binding to continue editing."
            : "Software with access to the Studio connection will be able to change mappings without Fn+U. This setting persists across restarts."}
        </p>
        {draft && !hasUnlock && (
          <p role="alert" className="edge-inline-error">
            No Unlock Studio binding exists. You may lose Studio editing access
            and need a settings reset or firmware recovery. Recovery is not
            guaranteed.
          </p>
        )}
        <div className="edge-dialog-actions">
          <button className="edge-button" onClick={() => setConfirm(false)}>
            Cancel
          </button>
          <button
            className="edge-button edge-button-primary"
            disabled={!ready || busy || state !== "ready" || unsaved !== false}
            onClick={save}
          >
            {draft ? "Enable and lock" : "Disable unlock requirement"}
          </button>
        </div>
      </dialog>
    </section>
  );
}
