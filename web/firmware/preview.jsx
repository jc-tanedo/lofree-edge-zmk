// QA entry only; never distributed. Every device operation is synthetic.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { createWorkspace } from "./workspace.js";
import { factoryMap, remapKey } from "../dist/keymap.js";
import { KEY_LAYOUT } from "../dist/layout.js";
import { telinkCrc32 } from "../dist/firmware.js";
async function mountPreview() {
  const hid = new EventTarget();
  let current,
    failVerify = false,
    failFlash = false,
    continueFlash;
  let map = remapKey(
    factoryMap(),
    KEY_LAYOUT.find((k) => k.label === "CapsLock").id,
    KEY_LAYOUT.find((k) => k.label === "Fn").triple,
  );
  const bytes = new Uint8Array(36).fill(0xa5);
  bytes.set([75, 78, 76, 84], 8);
  new DataView(bytes.buffer).setUint32(24, 36, true);
  new DataView(bytes.buffer).setUint32(
    32,
    telinkCrc32(bytes.subarray(0, 32)),
    true,
  );
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  const workspace = createWorkspace({
    hid,
    secure: true,
    request: async () => {
      const connection = {
        device: {
          opened: true,
          productName: "Synthetic Edge",
          vendorId: 0x05ac,
          productId: 0x0256,
        },
        close: async () => {
          connection.device.opened = false;
        },
        verifyForFirmwareUpdate: async () => {
          if (failVerify) {
            failVerify = false;
            throw new Error("Synthetic verification failure");
          }
        },
        read: async (_offset, length) => ({
          data: new Uint8Array(length),
          request: new Uint8Array(),
          response: new Uint8Array(),
        }),
        loadKeymap: async () => map.slice(),
        applyKeymap: async (next) => {
          map = next.slice();
        },
      };
      current = connection;
      return connection;
    },
    fetcher: async (file) =>
      file.endsWith("manifest.json")
        ? {
            ok: true,
            json: async () => ({
              format: "lofree-edge-browser-firmware-v1",
              builds: [
                {
                  file: "edge-preview.ota.bin",
                  label: "SYNTHETIC UI TEST — never flash",
                  size: 36,
                  sha256: hash,
                  board: "lofree_edge",
                },
              ],
            }),
          }
        : { ok: true, arrayBuffer: async () => bytes.buffer.slice(0) },
    flash: async (_connection, _image, _build, progress) => {
      if (failFlash) {
        failFlash = false;
        throw new Error("Synthetic transfer failure");
      }
      progress(1, 3);
      await new Promise((resolve) => {
        continueFlash = resolve;
      });
      progress(3, 3);
    },
  });
  function Preview() {
    const [, update] = useState(0);
    return (
      <>
        <aside
          style={{
            background: "#f7e6a7",
            color: "#665015",
            padding: 12,
            position: "relative",
            zIndex: 120,
          }}
        >
          <strong>UI PREVIEW — no hardware connection or writes</strong>{" "}
          <button
            onClick={() => {
              failVerify = true;
            }}
          >
            Fail next verification
          </button>{" "}
          <button
            onClick={() => {
              failFlash = true;
            }}
          >
            Fail next transfer
          </button>{" "}
          <button
            onClick={() => {
              continueFlash?.();
              continueFlash = null;
              update((v) => v + 1);
            }}
          >
            Finish synthetic transfer
          </button>{" "}
          <button
            onClick={() => {
              if (current) {
                const event = new Event("disconnect");
                Object.assign(event, { device: current.device });
                hid.dispatchEvent(event);
              }
            }}
          >
            Disconnect synthetic device
          </button>
        </aside>
        <App workspace={workspace} />
      </>
    );
  }
  createRoot(document.getElementById("root")).render(<Preview />);
}
void mountPreview();
