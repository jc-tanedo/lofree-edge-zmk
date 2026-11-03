// SPDX-License-Identifier: GPL-3.0-or-later
import React from "react";
import {
  automaticInstall,
  verificationPending,
} from "../dist/firmware-acceptance.js";
export default function FirmwareInstaller({
  s,
  workspace,
  updateConnected,
  supported,
  onInstall,
  onResume,
}) {
  return (
    <div
      id="firmware-view"
      role="tabpanel"
      aria-labelledby="tab-firmware"
      hidden={s.view !== "firmware"}
    >
      <section
        className="remap-panel firmware-panel"
        aria-labelledby="firmware-title"
      >
        <div className="card-top">
          <span className="eyebrow">FIRMWARE / USB INSTALLER</span>
          <span className="quiet">Lofree Edge only · Experimental</span>
        </div>
        <h2 id="firmware-title">Install firmware</h2>
        <p className="section-copy">
          USB installation. Stock firmware is retained for recovery.
        </p>
        <div className="installer-steps">
          <section
            className="installer-step"
            aria-labelledby="choose-build-title"
          >
            <p className="step-number">01 / CHOOSE</p>
            <h3 id="choose-build-title">Select a build</h3>
            <label htmlFor="firmware-image">Image-checked Edge builds</label>
            <select
              id="firmware-image"
              value={s.selectedBuild}
              disabled={s.busy}
              onChange={(event) =>
                void workspace.selectBuild(event.target.value)
              }
            >
              <option value="">Choose firmware</option>
              {s.builds.map((build) => (
                <option key={build.file} value={build.file}>
                  {build.label}
                </option>
              ))}
            </select>
            <details className="build-details">
              <summary>Build details &amp; download</summary>
              <p id="firmware-details" className="hint firmware-digest">
                {s.approved &&
                  `${s.approved.size.toLocaleString()} bytes · SHA-256 ${s.approved.sha256}`}
              </p>
              {s.approved && (
                <a
                  id="firmware-download"
                  download
                  href={`firmware/${s.approved.file}`}
                >
                  Download selected image ↓
                </a>
              )}
            </details>
          </section>
          <section
            id="firmware-connection-step"
            className={`installer-step${updateConnected ? " is-connected" : ""}`}
            aria-labelledby="connect-update-title"
          >
            <p className="step-number">02 / CONNECT</p>
            <h3 id="connect-update-title">Connect in wired mode</h3>
            <p>
              Using ZMK? Hold <strong>Fn + Space</strong> for 3 seconds, then
              release to return to stock first.
            </p>
            {updateConnected ? (
              <div
                id="firmware-connection-indicator"
                className="firmware-connection-indicator"
                role="status"
              >
                <span className="firmware-connection-check" aria-hidden="true">
                  ✓
                </span>
                <div>
                  <strong>Connected</strong>
                  <span>Stock keyboard verified</span>
                </div>
              </div>
            ) : (
              <button
                id="firmware-connect"
                type="button"
                className="secondary"
                disabled={s.busy || !supported}
                onClick={() => void workspace.connectUpdate()}
              >
                Connect stock update interface
              </button>
            )}
          </section>
          <section
            className="installer-step"
            aria-labelledby="install-build-title"
          >
            <p className="step-number">03 / INSTALL</p>
            <h3 id="install-build-title">Install the build</h3>
            <p>
              Keep USB connected until installation completes. Installation
              requires confirmation.
            </p>
            <button
              id="firmware-install"
              type="button"
              disabled={s.busy || !s.image || !updateConnected}
              onClick={onInstall}
            >
              Install firmware…
            </button>
          </section>
        </div>
        <div className="install-feedback">
          {s.progress !== null && (
            <progress
              id="firmware-progress"
              max="1"
              value={s.progress}
              aria-label="Firmware installation progress"
            />
          )}
          <p
            id="firmware-status"
            className={`hint${s.firmwareError ? " error" : ""}`}
            role="status"
            aria-live="polite"
          >
            {s.firmwareStatus}
          </p>
          {verificationPending(s.lastAttempt) && (
            <div role="status">
              <p>
                Keep this firmware installed when you turn the keyboard off and
                on or restart it. Reconnect in ON mode to verify and finalize
                without uploading again.
              </p>
              <button
                type="button"
                disabled={s.busy || !supported}
                onClick={onResume}
              >
                Finalize Installation
              </button>
            </div>
          )}
          {!verificationPending(s.lastAttempt) &&
            automaticInstall(s.approved) &&
            !updateConnected && (
              <details className="installation-help">
                <summary>Already uploaded this build?</summary>
                <p>
                  Keep this firmware installed when you turn the keyboard off
                  and on or restart it. This verifies the selected firmware
                  without uploading again. Select the keyboard in ON mode when
                  prompted.
                </p>
                <button
                  type="button"
                  disabled={s.busy || !supported}
                  onClick={onResume}
                >
                  Finalize Installation
                </button>
              </details>
            )}
          {s.lastAttempt &&
            ["preflight", "transferring", "failed"].includes(
              s.lastAttempt.state,
            ) && (
              <p id="firmware-last-attempt" className="hint error">
                Previous update{" "}
                {s.lastAttempt.state === "failed"
                  ? "stopped"
                  : "was interrupted"}
                : {s.lastAttempt.completed ?? 0} / {s.lastAttempt.total} blocks
                acknowledged. Reconnect and verify the running firmware before
                starting another update.
              </p>
            )}
        </div>
        <details className="installation-help">
          <summary>Installation &amp; recovery notes</summary>
          <p className="hint">
            The browser verifies the image hash and waits for each block to be
            acknowledged. It stops on an error and never overwrites retained
            stock from ZMK.
          </p>
          <p className="hint">
            Validated builds reconnect, verify and finish installation
            automatically. Development builds remain trials; repeated
            unconfirmed restarts can return them to stock. The browser may ask
            permission for the new USB interface.
          </p>
          <p className="hint">
            Hold Fn + Space for 3 seconds to return to stock. The physical Fn +
            Up startup recovery chord also remains available if mappings change.
          </p>
        </details>
      </section>
      <details className="studio-help" aria-labelledby="studio-title">
        <summary>
          <span>
            <span className="eyebrow">AFTER INSTALLATION</span>
            <strong id="studio-title">Studio setup</strong>
          </span>
          <span className="disclosure-plus" aria-hidden="true">
            +
          </span>
        </summary>
        <div className="studio-help-content">
          <p>
            Connect in <a href="studio/">Edge Studio →</a> over USB, then press{" "}
            <strong>Fn + U</strong> to unlock. Three layers: Base, Fn, and one
            spare. Save writes the keymap to device storage.
          </p>
          <p>
            Files → Import / Export transfers .keymap files. Applying a keymap
            does not require a firmware rebuild.
          </p>
          <div className="actions">
            <a className="button-link" href="studio/">
              Open Edge Studio →
            </a>
            <a
              className="button-link secondary-link"
              href="edge-info.json"
              download="info.json"
            >
              Download layout info.json ↓
            </a>
          </div>
        </div>
      </details>
    </div>
  );
}
