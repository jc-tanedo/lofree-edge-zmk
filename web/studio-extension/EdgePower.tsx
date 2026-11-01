// SPDX-License-Identifier: GPL-3.0-or-later
import { NoResponseError, MetaError } from "@zmkfirmware/zmk-studio-ts-client";
import { useContext, useEffect, useState, useRef } from "react";
import { ConnectionContext } from "./rpc/ConnectionContext";
import { LockStateContext } from "./rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { powerRpc, validPower, type Power } from "./edge-power-rpc";
import { usePub } from "./usePubSub";
const defaults = {
  schema: 1,
  dimSeconds: 30,
  offSeconds: 120,
  sleepSeconds: 900,
  dimPercent: 20,
  capabilities: 0,
  status: 0,
};
export function EdgePower({ ready, busy }: { ready: boolean; busy: boolean }) {
  const connection = useContext(ConnectionContext),
    lock = useContext(LockStateContext),
    publish = usePub();
  const [saved, setSaved] = useState<Power>(),
    [draft, setDraft] = useState<Power>();
  const [error, setError] = useState(""),
    [state, setState] = useState("idle"),
    [notice, setNotice] = useState("");
  const generation = useRef(0);
  const dirty =
    !!draft &&
    !!saved &&
    ["dimSeconds", "offSeconds", "sleepSeconds", "dimPercent"].some(
      (k) => draft[k as keyof Power] !== saved[k as keyof Power],
    );
  useEffect(() => {
    void publish("edge.power.dirty", dirty);
    return () => {
      void publish("edge.power.dirty", false);
    };
  }, [dirty]);
  useEffect(() => {
    const id = ++generation.current;
    setSaved(undefined);
    setDraft(undefined);
    setError("");
    setNotice("");
    setState("idle");
    if (
      !ready ||
      !connection.conn ||
      lock !== LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED
    )
      return;
    setState("loading");
    void publish("edge.ui.busy", true);
    const timer = window.setTimeout(() => {
      if (id !== generation.current) return;
      generation.current++;
      setState("error");
      setError("Reading power settings timed out. Reconnect and retry.");
    }, 15000);
    void powerRpc(connection.conn)
      .then((p) => {
        if (id === generation.current) {
          setSaved(p);
          setDraft(p);
          setState("ready");
        }
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
            ? "This firmware does not support editable power settings."
            : e instanceof Error
              ? e.message
              : "Could not read power settings.",
        );
      })
      .finally(() => {
        window.clearTimeout(timer);
        if (id === generation.current) void publish("edge.ui.busy", false);
      });
    return () => {
      generation.current++;
      window.clearTimeout(timer);
      void publish("edge.ui.busy", false);
    };
  }, [connection, lock, ready]);
  async function save() {
    if (!draft || !validPower(draft) || !connection.conn) return;
    const id = generation.current;
    setState("saving");
    setError("");
    setNotice("");
    void publish("edge.ui.busy", true);
    const timer = window.setTimeout(() => {
      if (id !== generation.current) return;
      generation.current++;
      setError(
        "Saving timed out. Reconnect to read what the keyboard stored before retrying.",
      );
      setState("error");
    }, 15000);
    try {
      await powerRpc(connection.conn, draft);
      const actual = await powerRpc(connection.conn);
      if (
        ["dimSeconds", "offSeconds", "sleepSeconds", "dimPercent"].some(
          (k) => actual[k as keyof Power] !== draft[k as keyof Power],
        )
      )
        throw new Error(
          "Saved settings did not match readback. Reconnect and read again.",
        );
      if (id === generation.current) {
        setSaved(actual);
        setDraft(actual);
        setNotice("Power settings saved on keyboard.");
        setState("ready");
      }
    } catch (e) {
      if (id === generation.current) {
        setError(e instanceof Error ? e.message : "Could not save settings.");
        setState("ready");
      }
    } finally {
      window.clearTimeout(timer);
      void publish("edge.ui.busy", false);
    }
  }
  return (
    <section
      className="edge-power-panel"
      aria-label="Power settings"
      aria-busy={state === "loading" || state === "saving"}
    >
      <div>
        <span className="edge-eyebrow">POWER</span>
        <h2>Idle and backlight</h2>
        <p>
          Saved on the keyboard. Timers run from the last key activity. USB
          editing is available in ON only.
        </p>
      </div>
      {state === "loading" && (
        <div className="edge-power-skeleton" role="status">
          Reading power settings…
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
      {draft && saved && (
        <fieldset disabled={!ready || busy || state !== "ready"}>
          <div className="edge-power-grid">
            {(
              [
                ["dimSeconds", "Dim after"],
                ["offSeconds", "Backlight off after"],
                ["sleepSeconds", "Bluetooth sleep after"],
              ] as const
            ).map(([name, label]) => (
              <label key={name}>
                {label}
                <input
                  type="number"
                  min="0"
                  max="86400"
                  step="1"
                  value={draft[name]}
                  disabled={
                    name === "sleepSeconds" && !(saved.capabilities & 6)
                  }
                  onChange={(e) => {
                    setDraft({ ...draft, [name]: e.target.valueAsNumber });
                    setNotice("");
                  }}
                />
                <small>Seconds · 0 = Never</small>
              </label>
            ))}
            <label>
              Dimmed brightness
              <input
                type="number"
                min="0"
                max="100"
                value={draft.dimPercent}
                onChange={(e) =>
                  setDraft({ ...draft, dimPercent: e.target.valueAsNumber })
                }
              />
              <small>% of selected brightness</small>
            </label>
          </div>
          <p>
            Active timers must follow dim → off → sleep order. Manually disabled
            backlighting stays off.
          </p>
          <p>
            Bluetooth sleep keeps a connected link in low power; disconnected
            deep sleep reconnects on wake. The deep-sleep wake key may be
            consumed.
          </p>
          {dirty && !validPower(draft) && (
            <p role="alert">
              Use whole seconds up to 86400 (24 hours), in order, and a
              brightness from 0–100%.
            </p>
          )}
          <div className="edge-dialog-actions">
            <button
              className="edge-button"
              onClick={() =>
                setDraft({ ...defaults, capabilities: saved.capabilities })
              }
            >
              Restore power defaults
            </button>
            <button
              className="edge-button"
              disabled={!dirty}
              onClick={() => setDraft(saved)}
            >
              Discard
            </button>
            <button
              className="edge-button edge-button-primary"
              disabled={!dirty || !validPower(draft)}
              onClick={save}
            >
              Save power settings
            </button>
          </div>
          {notice && <p role="status">{notice}</p>}
        </fieldset>
      )}
    </section>
  );
}
