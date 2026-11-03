// SPDX-License-Identifier: GPL-3.0-or-later
import React, { useEffect, useState, useSyncExternalStore } from "react";
import { createWorkspace } from "./workspace.js";
import { hasPendingChanges } from "../dist/keymap.js";
import StockTools from "./StockTools.jsx";
import FirmwareInstaller from "./FirmwareInstaller.jsx";
import { automaticInstall } from "../dist/firmware-acceptance.js";
import ConfirmDialog from "./ConfirmDialog.jsx";

export default function App({ workspace: supplied }) {
  const [workspace] = useState(() => supplied || createWorkspace());
  const s = useSyncExternalStore(
    workspace.subscribe,
    workspace.getSnapshot,
    workspace.getSnapshot,
  );
  const [resume, setResume] = useState(false);
  const [installOpen, setInstallOpen] = useState(false),
    [ack, setAck] = useState(false),
    [restoreOpen, setRestoreOpen] = useState(false);
  const connected = Boolean(s.connection?.device.opened),
    updateConnected = Boolean(s.verified && s.updateConnection?.device.opened);
  const dirty = Boolean(s.draft && hasPendingChanges(s.draft, s.appliedHex));
  const supported = s.supported;
  const ready =
    connected && s.layoutConnection === s.connection && Boolean(s.draft);
  useEffect(() => {
    workspace.start();
    void workspace.loadCatalog();
    return () => workspace.dispose();
  }, [workspace]);
  useEffect(() => {
    document.dispatchEvent(
      new CustomEvent("edge-unsaved-changes", { detail: dirty }),
    );
    return () =>
      document.dispatchEvent(
        new CustomEvent("edge-unsaved-changes", { detail: false }),
      );
  }, [dirty]);
  useEffect(() => {
    function fromHash() {
      const node = document.getElementById(location.hash.slice(1));
      workspace.setView(node?.closest("#stock-tools") ? "stock" : "firmware");
      if (node)
        requestAnimationFrame(() => {
          for (let p = node.parentElement; p; p = p.parentElement)
            if (p instanceof HTMLDetailsElement) p.open = true;
          node.scrollIntoView({ block: "start" });
        });
    }
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [workspace]);
  const changeTab = (view) => {
    workspace.setView(view);
    history.replaceState(
      null,
      "",
      view === "stock" ? "#stock-tools" : "#firmware-title",
    );
  };
  const tabKeys = (event) => {
    if (
      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) ||
      s.busy
    )
      return;
    event.preventDefault();
    const view =
      event.key === "Home"
        ? "firmware"
        : event.key === "End"
          ? "stock"
          : s.view === "stock"
            ? "firmware"
            : "stock";
    changeTab(view);
    document.getElementById(`tab-${view}`).focus();
  };
  const beginInstall = (resume = false) => {
    setResume(resume);
    setAck(false);
    setInstallOpen(true);
  };
  return (
    <>
      {React.createElement("edge-risk-notice")}
      <header className="suite-header">
        <div inert={s.busy ? "" : undefined}>
          {React.createElement("edge-navigation", { active: "firmware" })}
        </div>
        <span className="edition">Independent configurator</span>
        <span
          id="connection-status"
          className={`pill${connected || updateConnected ? " connected" : ""}`}
        >
          {updateConnected
            ? "Update interface connected"
            : connected
              ? "Connected"
              : "Disconnected"}
        </span>
      </header>
      <main>
        <section className="intro">
          <div className="intro-content">
            <p className="eyebrow">LOFREE EDGE / FIRMWARE &amp; TOOLS</p>
            <h1>
              Edge
              <br />
              configuration<span className="title-period">.</span>
            </h1>
            <p className="intro-copy">
              Install firmware over USB. Use Studio to edit keys and layers.
            </p>
            <div className="actions">
              <a className="button-link" href="studio/">
                Open Edge Studio →
              </a>
              <a className="button-link secondary-link" href="#firmware-title">
                Install firmware ↓
              </a>
            </div>
          </div>
          <figure className="intro-figure">
            <img
              src="assets/edge-illustration.svg"
              width="620"
              height="340"
              alt="Original illustration of the Lofree Edge with its 84-key layout"
            />
            <figcaption>
              EDGE / 84 KEYS <span>LOW-PROFILE KEYBOARD</span>
            </figcaption>
          </figure>
        </section>
        <div
          className="workspace-tabs"
          role="tablist"
          aria-label="Keyboard tools"
        >
          {["firmware", "stock"].map((view) => (
            <button
              key={view}
              id={`tab-${view}`}
              className="secondary"
              type="button"
              role="tab"
              aria-selected={s.view === view}
              aria-controls={view === "stock" ? "stock-tools" : "firmware-view"}
              tabIndex={s.view === view ? 0 : -1}
              disabled={s.busy}
              onClick={() => changeTab(view)}
              onKeyDown={tabKeys}
            >
              {view === "stock" ? "Stock tools" : "Firmware"}
            </button>
          ))}
          <span>Stock firmware or ZMK.</span>
        </div>
        <FirmwareInstaller
          s={s}
          workspace={workspace}
          updateConnected={updateConnected}
          supported={supported}
          onInstall={() => beginInstall(false)}
          onResume={() => beginInstall(true)}
        />
        <StockTools
          s={s}
          workspace={workspace}
          connected={connected}
          ready={ready}
          dirty={dirty}
          onRestore={() => setRestoreOpen(true)}
        />
      </main>
      <ConfirmDialog
        id="firmware-dialog"
        open={installOpen}
        aria-labelledby="firmware-confirm-title"
        aria-describedby="firmware-confirm-description"
        onClose={(value) => {
          const allowed = value === "install" && ack;
          setInstallOpen(false);
          setAck(false);
          if (allowed)
            void (resume
              ? workspace.resumeInstallation(true)
              : workspace.install(true));
        }}
      >
        <form method="dialog">
          <div className="dialog-heading">
            <span className="warning-icon" aria-hidden="true">
              !
            </span>
            <div>
              <p className="eyebrow">FIRMWARE INSTALLATION</p>
              <h2 id="firmware-confirm-title">
                {resume ? "Finish installation?" : "Install this build?"}
              </h2>
            </div>
          </div>
          <p id="firmware-confirm-details">
            {resume
              ? `Finish ${s.lastAttempt?.file} · SHA-256 ${s.lastAttempt?.sha256}`
              : s.approved &&
                `${s.approved.label} (${s.approved.size.toLocaleString()} bytes)`}
          </p>
          <div className="restore-impact">
            <strong>Keep the USB cable connected.</strong>
            <span id="firmware-confirm-description">
              {resume
                ? "This verifies the installed firmware and completes installation without uploading again. "
                : "This replaces the inactive firmware and restarts the keyboard. "}
              {resume || automaticInstall(s.approved)
                ? "Successful verification runs a flash storage self-test and makes the firmware persistent, ending automatic rollback. "
                : "This development build stays in trial mode; repeated restarts may return it to stock. "}
              Stock firmware is retained. Firmware can make the keyboard
              unusable or lose settings. Recovery may require external
              programming hardware and may fail. Backups and retained stock
              recovery are not guarantees. Use entirely at your own risk.
            </span>
          </div>
          <label className="edge-risk-ack">
            <input
              id="firmware-risk-ack"
              type="checkbox"
              checked={ack}
              onChange={(event) => setAck(event.target.checked)}
              required
            />{" "}
            I understand this is experimental and I use this firmware, website,
            tools and instructions entirely at my own risk. Recovery is not
            guaranteed.
          </label>
          <div className="dialog-actions">
            <button value="cancel" className="secondary" formNoValidate>
              Cancel
            </button>
            <button
              id="firmware-confirm-install"
              value="install"
              className="danger"
              disabled={!ack}
            >
              {resume ? "Continue installation" : "Install Firmware"}
            </button>
          </div>
        </form>
      </ConfirmDialog>
      <ConfirmDialog
        id="restore-dialog"
        open={restoreOpen}
        aria-labelledby="restore-title"
        aria-describedby="restore-description"
        onClose={(value) => {
          setRestoreOpen(false);
          if (value === "confirm") void workspace.apply(true);
        }}
      >
        <form method="dialog">
          <div className="dialog-heading">
            <span className="warning-icon" aria-hidden="true">
              !
            </span>
            <div>
              <p className="eyebrow">FACTORY RESET</p>
              <h2 id="restore-title">Restore every key?</h2>
            </div>
          </div>
          <p id="restore-description">
            All 84 key assignments will return to their keycap defaults.
          </p>
          <div className="restore-impact">
            <strong>Your custom mappings will be replaced.</strong>
            <span>
              This includes mappings created on another computer. You can remap
              keys again afterward.
            </span>
          </div>
          <div className="dialog-actions">
            <button value="cancel" className="secondary">
              Cancel
            </button>
            <button id="confirm-restore" value="confirm" className="danger">
              Restore all defaults
            </button>
          </div>
        </form>
      </ConfirmDialog>
      <footer>
        <span>Lofree Edge configurator.</span>
        <span>Local device access · No account or uploads</span>
      </footer>
    </>
  );
}
