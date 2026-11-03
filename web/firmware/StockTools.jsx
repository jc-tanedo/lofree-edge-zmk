// SPDX-License-Identifier: GPL-3.0-or-later
import React from "react";
import { KEY_LAYOUT } from "../dist/layout.js";
import { targetOptions, countChanges } from "../dist/keymap.js";
import { toHex } from "../dist/protocol.js";
const OPTIONS = targetOptions();
const LABELS = {
  BackSpace: "Backspace",
  CapsLock: "Caps",
  PrintScreen: "PrtSc",
  PageUp: "PgUp",
  PageDown: "PgDn",
  "Left Shift": "Shift",
  "Right Shift": "Shift",
  "Left Ctrl": "Ctrl",
  "Right Ctrl": "Ctrl",
  "Left Alt": "Alt",
  "Right Alt": "Alt",
  "Left Win": "Win",
};
function download(name, value) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2) + "\n"], {
      type: "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function StockTools({
  s,
  workspace,
  connected,
  ready,
  dirty,
  onRestore,
}) {
  const snapshot = s.snapshot,
    selected = s.selectedKey;
  const selectedTriple =
    selected && s.draft
      ? Array.from(
          s.draft.slice(selected.slot * 3, selected.slot * 3 + 3),
        ).join(",")
      : "";
  const changes = s.draft ? countChanges(s.draft) : 0;
  return (
    <section
      id="stock-tools"
      role="tabpanel"
      aria-labelledby="tab-stock"
      hidden={s.view !== "stock"}
    >
      <div className="stock-tools-intro">
        <h2>Stock firmware tools</h2>
        <p>
          Read settings and remap keys on stock Lofree firmware. Use Studio for
          ZMK keymaps.
        </p>
      </div>
      <section className="workspace" aria-label="Keyboard workspace">
        <article className="device-card">
          <div className="card-top">
            <span className="eyebrow">CONNECTION</span>
            <span className="usb-label">USB WIRED</span>
          </div>
          <div className="device-identity">
            <span className="device-symbol" aria-hidden="true">
              E /
            </span>
            <div>
              <h2>Lofree Edge</h2>
              <span className="quiet">Original firmware · USB connection</span>
            </div>
          </div>
          <p id="device-description">
            {connected
              ? `${s.connection.device.productName} is connected and ready.`
              : "Plug in a USB data cable and switch your keyboard to wired mode."}
          </p>
          <div className="actions">
            {connected ? (
              <button
                id="disconnect"
                className="secondary"
                type="button"
                disabled={s.busy}
                onClick={() => void workspace.disconnectStock()}
              >
                Disconnect
              </button>
            ) : (
              <button
                id="connect"
                type="button"
                disabled={s.busy || !s.supported}
                onClick={() => void workspace.connectStock()}
              >
                Connect stock firmware <span aria-hidden="true">↗</span>
              </button>
            )}
          </div>
          <p id="compatibility" className="hint">
            Requires a desktop browser with WebHID, such as Chrome or Edge.
            Linux may require a device permission rule.
          </p>
        </article>
        <article className="settings-card">
          <div className="card-top">
            <span className="eyebrow">SETTINGS</span>
            <span id="read-state" className="quiet">
              {s.busy && connected
                ? "Keyboard busy"
                : snapshot
                  ? "Snapshot available"
                  : connected
                    ? "Ready to read"
                    : "Waiting for connection"}
            </span>
          </div>
          {snapshot ? (
            <div id="snapshot">
              <div className="snapshot-heading">
                <h2>Settings snapshot</h2>
                <span id="read-time" className="quiet">
                  {new Date(snapshot.capturedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <dl className="facts">
                <div>
                  <dt>Device</dt>
                  <dd id="snapshot-device">{snapshot.device.name}</dd>
                </div>
                <div>
                  <dt>Bytes read</dt>
                  <dd>56</dd>
                </div>
                <div>
                  <dt>Configuration changes</dt>
                  <dd>None</dd>
                </div>
              </dl>
              <dl className="facts">
                <div>
                  <dt>Backlight level</dt>
                  <dd id="brightness">
                    {snapshot.decodedProfile.brightness === null
                      ? "Unrecognized"
                      : `${snapshot.decodedProfile.brightness} / 4`}
                  </dd>
                </div>
                <div>
                  <dt>Effect speed</dt>
                  <dd id="effect-speed">
                    {snapshot.decodedProfile.effectSpeed ?? "Unrecognized"}
                  </dd>
                </div>
              </dl>
              <p className="snapshot-note">
                Lighting is read-only. Use the key editor below to change
                individual key assignments.
              </p>
              <details>
                <summary>View configuration bytes</summary>
                <pre id="hex-output" tabIndex="0">
                  {snapshot.dataHex
                    .match(/.{1,16}/g)
                    ?.map(
                      (row, i) =>
                        `${(i * 8).toString(16).padStart(4, "0")}   ${row.match(/../g).join(" ")}`,
                    )
                    .join("\n")}
                </pre>
                <p className="hint">
                  These bytes are a partial configuration snapshot, not a
                  complete backup.
                </p>
              </details>
            </div>
          ) : (
            <div id="empty-state">
              <div className="empty-symbol" aria-hidden="true">
                ↳
              </div>
              <h2>No settings loaded</h2>
              <p>
                Settings are read on connection. Export the snapshot to save a
                local copy.
              </p>
            </div>
          )}
          <div className="actions settings-actions">
            <button
              id="read"
              type="button"
              disabled={s.busy || !connected}
              onClick={() => void workspace.readSettings()}
            >
              Read settings
            </button>
            <button
              id="export"
              className="secondary"
              type="button"
              disabled={s.busy || !snapshot}
              onClick={() =>
                download(
                  `lofree-edge-${snapshot.capturedAt.replace(/[:.]/g, "-")}.json`,
                  snapshot,
                )
              }
            >
              Save snapshot ↓
            </button>
          </div>
        </article>
      </section>
      <p
        id="message"
        className={`message${s.messageError ? " error" : ""}`}
        role="status"
        aria-live="polite"
      >
        {s.message}
      </p>
      <section className="remap-panel" aria-labelledby="remap-title">
        <div className="card-top">
          <span className="eyebrow">KEY EDITOR</span>
          <span id="keymap-state" className="quiet">
            {ready ? "84 keys · Current device map" : "Layout not loaded"}
          </span>
        </div>
        <div className="remap-heading">
          <div>
            <h2 id="remap-title">Stock keymap</h2>
            <p>Select a key, assign an action, then apply the draft.</p>
          </div>
          <button
            id="load-keymap"
            type="button"
            className="secondary"
            disabled={s.busy || !connected || ready}
            onClick={() => void workspace.loadLayout()}
          >
            {ready ? "Layout verified" : "Load key layout"}
          </button>
        </div>
        <p className="mapping-notice">
          For the original Lofree firmware. Current assignments are read
          directly from the keyboard. The original Fn stays protected; use Edge
          Studio for editable layers.
        </p>
        {s.draft && (
          <>
            <div id="keyboard-scroll" className="keyboard-scroll">
              <div
                id="keyboard"
                className="key-board"
                role="group"
                aria-label="Lofree Edge 84-key layout"
              >
                {KEY_LAYOUT.map((key) => {
                  const triple = s.draft.slice(key.slot * 3, key.slot * 3 + 3),
                    changed =
                      toHex(triple) !== toHex(Uint8Array.from(key.triple));
                  return (
                    <button
                      key={key.id}
                      type="button"
                      data-key-id={key.id}
                      aria-label={
                        key.label === "Fn"
                          ? "Fn — protected"
                          : `Remap ${key.label}`
                      }
                      title={key.label === "Fn" ? "Fn is protected" : key.label}
                      style={{
                        left: `${(key.x / 419) * 100}%`,
                        top: `${(key.y / 156) * 100}%`,
                        width: `${(key.width / 419) * 100}%`,
                        height: `${(key.height / 156) * 100}%`,
                      }}
                      disabled={s.busy || !ready || key.triple[0] !== 0x20}
                      className={`${selected === key ? "selected " : ""}${changed ? "changed" : ""}`}
                      aria-pressed={selected === key}
                      onClick={() => workspace.selectKey(key)}
                    >
                      {LABELS[key.label] ?? key.label}
                      <span className="key-target">
                        {changed
                          ? OPTIONS.find(
                              (option) =>
                                option.triple.join(",") ===
                                Array.from(triple).join(","),
                            )?.label ?? "?"
                          : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div id="key-controls" className="key-controls">
              <div>
                <label htmlFor="assignment">
                  Assign{" "}
                  <strong id="selected-key">
                    {selected?.label || "a key"}
                  </strong>{" "}
                  to
                </label>
                <select
                  id="assignment"
                  value={selectedTriple}
                  disabled={s.busy || !ready || !selected}
                  onChange={(event) =>
                    workspace.assign(event.target.value.split(",").map(Number))
                  }
                >
                  <option value="">Select a key on the layout</option>
                  {OPTIONS.map((option) => (
                    <option
                      key={option.triple.join(",")}
                      value={option.triple.join(",")}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                id="reset-key"
                type="button"
                className="secondary"
                disabled={s.busy || !ready || !selected}
                onClick={() => workspace.assign(selected.triple)}
              >
                Reset selected key
              </button>
              <p id="draft-summary" className="quiet">
                {changes} remapped {changes === 1 ? "key" : "keys"} ·{" "}
                {dirty ? "Draft not applied" : "Applied this session"}
              </p>
            </div>
          </>
        )}
        <div className="actions">
          <button
            id="apply-keymap"
            type="button"
            disabled={s.busy || !ready || !dirty}
            onClick={() => void workspace.apply(false)}
          >
            Apply keymap
          </button>
          <button
            id="export-keymap"
            type="button"
            className="secondary"
            disabled={s.busy || !s.draft}
            onClick={() =>
              download("lofree-edge-keymap-draft.json", workspace.exportDraft())
            }
          >
            Save draft ↓
          </button>
        </div>
        <p
          id="remap-result"
          className={`hint${s.remapError ? " error" : ""}`}
          aria-live="polite"
        >
          {s.remapMessage}
        </p>
        <div className="danger-zone">
          <div>
            <strong>Factory reset</strong>
            <p>Replace every key assignment with its keycap default.</p>
          </div>
          <button
            id="restore-keymap"
            type="button"
            className="danger"
            disabled={s.busy || !ready}
            onClick={onRestore}
          >
            Restore defaults
          </button>
        </div>
      </section>
    </section>
  );
}
