// SPDX-License-Identifier: GPL-3.0-or-later
import React, { useEffect, useState } from "react";
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
  const [step, setStep] = useState(0);
  const phase = s.installPhase || "idle";
  useEffect(() => {
    if (updateConnected) setStep(2);
  }, [updateConnected]);
  const current =
    phase === "uploading" || phase === "upload-error"
      ? 2
      : phase !== "idle"
        ? 3
        : step;
  const waiting = [
    "reconnecting",
    "selecting",
    "verifying",
    "testing",
    "accepting",
  ].includes(phase);
  const headings = {
    reconnecting: "Your keyboard is restarting",
    selecting: "Allow access to your keyboard",
    "permission-needed": "One more step: finalize installation",
    verifying: "Verifying your firmware",
    testing: "Checking firmware storage",
    accepting: "Finalizing installation",
    complete: "Installation complete",
    trial: "Development trial installed",
    error: "Installation needs attention",
  };
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
        <ol className="install-stepper" aria-label="Installation steps">
          {["Choose firmware", "Connect", "Install", "Finalize"].map(
            (label, index) => (
              <li
                key={label}
                aria-current={index === current ? "step" : undefined}
                className={
                  phase === "complete" || index < current
                    ? "is-done"
                    : index === current
                      ? "is-current"
                      : ""
                }
              >
                <span className="install-step-index" aria-hidden="true">
                  {phase === "complete" || index < current ? "✓" : index + 1}
                </span>
                <span>{label}</span>
              </li>
            ),
          )}
        </ol>
        <div className="installer-steps installer-wizard-panel">
          <section
            className="installer-step"
            aria-labelledby="choose-build-title"
            hidden={current !== 0}
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
            <div className="wizard-actions">
              <button
                type="button"
                disabled={s.busy || !s.image}
                onClick={() => setStep(1)}
              >
                Continue to connection →
              </button>
            </div>
            {phase === "idle" &&
              !verificationPending(s.lastAttempt) &&
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
          </section>
          <section
            id="firmware-connection-step"
            className={`installer-step${updateConnected ? " is-connected" : ""}`}
            aria-labelledby="connect-update-title"
            hidden={current !== 1}
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
            <div className="wizard-actions">
              {updateConnected && (
                <button
                  type="button"
                  disabled={s.busy}
                  onClick={() => setStep(2)}
                >
                  Continue to installation →
                </button>
              )}
              <button
                type="button"
                className="secondary"
                disabled={s.busy}
                onClick={() => setStep(0)}
              >
                ← Back
              </button>
            </div>
          </section>
          <section
            className="installer-step"
            aria-labelledby="install-build-title"
            hidden={current !== 2}
          >
            <p className="step-number">03 / INSTALL</p>
            <h3 id="install-build-title">Install the build</h3>
            <p>
              {s.busy
                ? "Uploading firmware. Keep the USB cable connected and this page open."
                : "Review the confirmation to install. After uploading, we’ll guide you through restarting and finalizing."}
            </p>
            <button
              id="firmware-install"
              type="button"
              disabled={s.busy || !s.image || !updateConnected}
              onClick={onInstall}
            >
              Install firmware…
            </button>
            {phase === "upload-error" && !s.busy && (
              <div className="wizard-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    workspace.reviewConnection();
                    setStep(1);
                  }}
                >
                  Review connection
                </button>
              </div>
            )}
            {!s.busy && phase === "idle" && (
              <div className="wizard-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setStep(1)}
                >
                  ← Back
                </button>
              </div>
            )}
          </section>
          <section
            className="installer-step install-final-stage"
            hidden={current !== 3}
            aria-labelledby="finalize-stage-title"
            aria-busy={waiting && s.busy}
          >
            <p className="step-number">04 / FINALIZE</p>
            <div className="wizard-stage-heading">
              {waiting && s.busy ? (
                <span className="install-spinner" aria-hidden="true" />
              ) : phase === "complete" ? (
                <span className="install-success" aria-hidden="true">
                  ✓
                </span>
              ) : null}
              <h3 id="finalize-stage-title">
                {headings[phase] || "Finalize installation"}
              </h3>
            </div>
            {waiting && s.busy && (
              <>
                <p>
                  Installation is still in progress. Keep USB connected, the
                  slider ON and this page open.
                </p>
                <progress
                  className="install-wait-progress"
                  aria-label="Finishing firmware installation"
                />
                {phase === "reconnecting" && (
                  <p className="hint">
                    Reconnecting can take up to 20 seconds. If access is needed,
                    we’ll show a Finalize Installation button here.
                  </p>
                )}
                {phase === "selecting" && (
                  <p className="hint">
                    Choose Lofree Edge ZMK in the browser’s device picker. No
                    firmware will be uploaded again.
                  </p>
                )}
              </>
            )}
            {phase === "permission-needed" && (
              <p>
                The upload is complete, but installation is not finished. Allow
                access to the restarted keyboard to verify it and keep the
                firmware across power-offs and restarts.
              </p>
            )}
            {verificationPending(s.lastAttempt) && (
              <div className="wizard-finalize-action">
                <p>
                  Keep this firmware installed when you turn the keyboard off
                  and on or restart it. Reconnect in ON mode to verify and
                  finalize without uploading again.
                </p>
                <div className="wizard-actions">
                  <button
                    type="button"
                    disabled={s.busy || !supported}
                    onClick={onResume}
                  >
                    Finalize Installation
                  </button>
                </div>
              </div>
            )}
            {phase === "complete" && (
              <>
                <p>
                  Firmware verified and saved for power-offs and restarts. You
                  can disconnect the keyboard or open Studio.
                </p>
                <a className="wizard-studio-link" href="studio/">
                  Open Studio →
                </a>
              </>
            )}
            {phase === "trial" && (
              <p>
                This development build remains a trial. Automatic rollback is
                still enabled; follow its test instructions before acceptance.
              </p>
            )}
          </section>
        </div>
        <div className="install-feedback">
          {s.progress !== null && phase !== "complete" && phase !== "trial" && (
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
