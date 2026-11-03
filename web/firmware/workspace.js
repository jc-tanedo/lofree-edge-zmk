// SPDX-License-Identifier: GPL-3.0-or-later
// Device operations are independent of React and never write without an action.
import {
  automaticInstall,
  verificationPending,
  findInstalledDevice,
  verifyAndAccept,
} from "../dist/firmware-acceptance.js";
import { EdgeConnection } from "../dist/webhid.js";
import { flashFirmware, validateFirmware } from "../dist/firmware.js";
import {
  protectFirmwareTransfer,
  readFirmwareAttempt,
  saveFirmwareAttempt,
} from "../dist/firmware-session.js";
import { toHex } from "../dist/protocol.js";
import { decodeProfile } from "../dist/profile.js";
import { factoryMap, remapKey, countChanges } from "../dist/keymap.js";

export function createWorkspace({
  hid = navigator.hid,
  secure = window.isSecureContext,
  request = () => EdgeConnection.request(hid),
  fetcher = fetch,
  target = window,
  storage,
  flash = flashFirmware,
  installedDevice = (choose) => findInstalledDevice(hid, choose),
  accept = verifyAndAccept,
} = {}) {
  if (storage === undefined) {
    try {
      storage = target.localStorage;
    } catch {}
  }
  let state = {
    busy: false,
    supported: Boolean(hid && secure),
    connection: null,
    snapshot: null,
    draft: null,
    selectedKey: null,
    layoutConnection: null,
    appliedHex: null,
    message: "Connect stock firmware to read settings.",
    messageError: false,
    remapMessage: "Connect stock firmware to read the current keymap.",
    remapError: false,
    builds: [],
    selectedBuild: "",
    image: null,
    approved: null,
    updateConnection: null,
    verified: false,
    firmwareStatus: "Loading available builds…",
    firmwareError: false,
    progress: null,
    lastAttempt: readFirmwareAttempt(storage),
    view: "firmware",
  };
  if (!state.supported)
    state.message = secure
      ? "This browser does not support WebHID. Open the page in desktop Chrome or Edge."
      : "Open this page over HTTPS or at localhost to connect your keyboard.";
  state.messageError = !state.supported;
  const listeners = new Set();
  let imageGeneration = 0,
    catalogGeneration = 0,
    active = false,
    listening = false;
  const patch = (values) => {
    if (active) {
      state = { ...state, ...values };
      listeners.forEach((fn) => fn());
    }
  };
  const message = (text, error = false) =>
    patch({ message: text, messageError: error });
  const remapMessage = (text, error = false) =>
    patch({ remapMessage: text, remapError: error });
  const status = (text, error = false) =>
    patch({ firmwareStatus: text, firmwareError: error });
  const begin = () => {
    if (!active || state.busy) return false;
    patch({ busy: true });
    return true;
  };
  const end = () => patch({ busy: false });
  async function closeStock() {
    const current = state.connection;
    patch({ connection: null });
    await current?.close();
  }
  async function readSettings(current) {
    if ((await current.read(0, 1)).data[0] !== 0)
      throw new Error(
        "This keyboard’s active profile is not supported by this early version.",
      );
    const exchange = await current.read(0, 56);
    if (state.connection !== current) return;
    patch({
      snapshot: {
        format: "lofree-edge-partial-snapshot-v1",
        capturedAt: new Date().toISOString(),
        device: {
          name: current.device.productName,
          vendorId: current.device.vendorId,
          productId: current.device.productId,
        },
        offset: 0,
        length: 56,
        dataHex: toHex(exchange.data),
        decodedProfile: decodeProfile(exchange.data),
        requestHex: toHex(exchange.request),
        responseHex: toHex(exchange.response),
      },
    });
  }
  async function loadLayout(current) {
    const draft = await current.loadKeymap();
    if (state.connection !== current) return;
    patch({
      draft,
      layoutConnection: current,
      appliedHex: toHex(draft),
      selectedKey: null,
    });
    remapMessage(
      "Current key assignments read from the keyboard. Choose a key to edit.",
    );
  }
  async function selectBuild(file) {
    if (!active) return;
    const generation = ++imageGeneration;
    patch({ selectedBuild: file, image: null, approved: null });
    const build = state.builds.find((item) => item.file === file);
    if (!build) return;
    try {
      const response = await fetcher(`firmware/${build.file}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Firmware download failed.");
      const image = await validateFirmware(
        new Uint8Array(await response.arrayBuffer()),
        build,
      );
      if (generation !== imageGeneration || !active) return;
      patch({ image, approved: build });
      status(
        state.verified
          ? "Image verified. Stock Edge connected; ready to install."
          : "Image verified. Connect the stock update interface.",
      );
    } catch (error) {
      if (generation === imageGeneration) status(error.message, true);
    }
  }
  async function finishInstallation(attempt, build, choose = false) {
    attempt.state = "verifying";
    saveFirmwareAttempt(storage, attempt);
    patch({ lastAttempt: null, progress: null });
    status("Restarting and reconnecting to the keyboard…");
    const device = await installedDevice(choose);
    await accept(device, build, (text) => status(text));
    attempt.state = "complete";
    delete attempt.error;
    saveFirmwareAttempt(storage, attempt);
    patch({ lastAttempt: null, progress: 1 });
    status("Installation complete. Firmware verified and ready to use.");
  }
  const onDisconnect = (event) => {
    if (state.connection?.device === event.device) {
      const current = state.connection;
      patch({ connection: null });
      void current.close().catch(() => {});
      message("Keyboard unplugged. Reconnect it to read again.");
    }
    if (state.updateConnection?.device === event.device) {
      patch({ updateConnection: null, verified: false });
      if (!state.busy)
        status(
          "Update interface disconnected. Reconnect stock firmware to install.",
        );
    }
  };
  return {
    start() {
      active = true;
      if (!listening) {
        hid?.addEventListener("disconnect", onDisconnect);
        listening = true;
      }
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot: () => state,
    setView(view) {
      if (!state.busy) patch({ view });
    },
    async loadCatalog() {
      if (!active) return;
      const generation = ++catalogGeneration;
      try {
        const response = await fetcher("firmware/manifest.json", {
          cache: "no-store",
        });
        if (!response.ok)
          throw new Error("Firmware builds are not available yet.");
        const manifest = await response.json();
        if (
          manifest.format !== "lofree-edge-browser-firmware-v1" ||
          !Array.isArray(manifest.builds)
        )
          throw new Error("Unrecognized firmware catalog.");
        if (
          manifest.builds.some(
            (build) => !/^[a-z0-9-]+\.ota\.bin$/.test(build.file),
          )
        )
          throw new Error("Invalid firmware filename.");
        if (!active || generation !== catalogGeneration) return;
        patch({ builds: manifest.builds });
        await selectBuild(manifest.builds[0]?.file || "");
      } catch (error) {
        if (active && generation === catalogGeneration)
          status(error.message, true);
      }
    },
    selectBuild,
    async connectUpdate() {
      if (!begin()) return;
      patch({ verified: false });
      try {
        await state.updateConnection?.close();
        await closeStock();
        const current = await request();
        patch({ updateConnection: current });
        await current.verifyForFirmwareUpdate();
        if (state.updateConnection !== current || !current.device.opened)
          throw new Error("Update interface disconnected.");
        patch({ verified: true });
        status("Stock Edge verified. Ready to install the selected firmware.");
      } catch (error) {
        await state.updateConnection?.close().catch(() => {});
        patch({ updateConnection: null, verified: false });
        status(error.message, true);
      } finally {
        end();
      }
    },
    async install(acknowledged) {
      const { image, approved, updateConnection: current, verified } = state;
      if (
        !acknowledged ||
        !image ||
        !approved ||
        !verified ||
        !current?.device.opened ||
        !begin()
      )
        return;
      const unprotect = protectFirmwareTransfer(target);
      const attempt = {
        state: "preflight",
        file: approved.file,
        sha256: approved.sha256,
        completed: 0,
        total: Math.floor(image.length / 16) + 1,
        automatic: automaticInstall(approved),
      };
      saveFirmwareAttempt(storage, attempt);
      patch({ lastAttempt: null, progress: 0 });
      try {
        await closeStock();
        if (!current.device.opened) await current.device.open();
        status("Installing firmware. Keep the USB cable connected…");
        await flash(current, image, approved, (done, total) => {
          attempt.state = "transferring";
          attempt.completed = done;
          if (done % 32 === 0 || done === total)
            saveFirmwareAttempt(storage, attempt);
          // React does not need a full render for every16-byte USB block.
          if (done === 1 || done % 32 === 0 || done === total) {
            patch({
              progress: done / total,
              firmwareStatus: `Installing firmware · ${Math.round((done / total) * 100)}%`,
              firmwareError: false,
            });
          }
        });
        attempt.state = "restart-requested";
        saveFirmwareAttempt(storage, attempt);
        await current.close().catch(() => {});
        if (automaticInstall(approved)) {
          await finishInstallation(attempt, approved);
        } else {
          attempt.state = "trial";
          saveFirmwareAttempt(storage, attempt);
          status(
            "Transfer complete. Development trial installed; automatic rollback remains enabled. Follow the build’s test instructions before acceptance.",
          );
        }
      } catch (error) {
        attempt.state =
          attempt.state === "verifying" ||
          (attempt.automatic && attempt.completed === attempt.total)
            ? "needs-attention"
            : "failed";
        attempt.error = error.message;
        saveFirmwareAttempt(storage, attempt);
        patch({ lastAttempt: { ...attempt } });
        status(
          attempt.state === "needs-attention"
            ? `Installation needs attention. ${error.message} Continue installation to verify its status; do not reflash yet.`
            : `${error.message} Reconnect and verify the running firmware before retrying.`,
          true,
        );
      } finally {
        unprotect();
        await current.close().catch(() => {});
        patch({ updateConnection: null, verified: false });
        end();
      }
    },
    async resumeInstallation(acknowledged) {
      const attempt = readFirmwareAttempt(storage);
      const build = state.builds.find(
        (b) => b.sha256 === attempt?.sha256 && b.file === attempt?.file,
      );
      if (
        !acknowledged ||
        !verificationPending(attempt) ||
        !automaticInstall(build) ||
        !begin()
      )
        return;
      const unprotect = protectFirmwareTransfer(target);
      try {
        await finishInstallation(attempt, build, true);
      } catch (error) {
        attempt.state = "needs-attention";
        attempt.error = error.message;
        saveFirmwareAttempt(storage, attempt);
        patch({ lastAttempt: { ...attempt } });
        status(`Installation needs attention. ${error.message}`, true);
      } finally {
        unprotect();
        end();
      }
    },
    async connectStock() {
      if (!begin()) return;
      message("Select your Edge in the browser’s device picker if prompted.");
      try {
        await state.updateConnection?.close();
        patch({ updateConnection: null, verified: false });
        const current = await request();
        patch({
          connection: current,
          snapshot: null,
          draft: null,
          selectedKey: null,
          layoutConnection: null,
          appliedHex: null,
        });
        message(
          "Keyboard connected. Reading settings and loading the key layout…",
        );
        await readSettings(current);
        await loadLayout(current);
        message(
          "Keyboard ready. Settings and key layout loaded automatically.",
        );
      } catch (error) {
        message(error.message, true);
      } finally {
        end();
      }
    },
    async disconnectStock() {
      if (!begin()) return;
      try {
        await closeStock();
        message("Disconnected. Your existing snapshot is still available.");
      } catch (error) {
        message(error.message, true);
      } finally {
        end();
      }
    },
    async readSettings() {
      if (!state.connection?.device.opened || !begin()) return;
      try {
        await readSettings(state.connection);
        message(
          "Settings read successfully. No configuration changes were made.",
        );
      } catch (error) {
        message(error.message, true);
      } finally {
        end();
      }
    },
    async loadLayout() {
      if (!state.connection?.device.opened || !begin()) return;
      try {
        await loadLayout(state.connection);
      } catch (error) {
        remapMessage(error.message, true);
      } finally {
        end();
      }
    },
    selectKey(key) {
      patch({ selectedKey: key });
    },
    assign(triple) {
      if (!state.draft || !state.selectedKey || state.busy) return;
      try {
        patch({ draft: remapKey(state.draft, state.selectedKey.id, triple) });
        remapMessage(
          "Draft updated. Apply keymap to send it to your keyboard.",
        );
      } catch (error) {
        remapMessage(error.message, true);
      }
    },
    async apply(restore = false) {
      if (
        !state.draft ||
        !state.connection?.device.opened ||
        state.connection !== state.layoutConnection ||
        !begin()
      )
        return;
      const map = restore ? factoryMap() : state.draft.slice();
      remapMessage(
        restore
          ? "Restoring keycap defaults. Keep the USB cable connected…"
          : "Applying keymap. Keep the USB cable connected…",
      );
      try {
        await state.connection.applyKeymap(map, (sent, total) =>
          remapMessage(
            `Sending keymap: ${sent} / ${total} bytes. Keep the USB cable connected…`,
          ),
        );
        patch({ draft: map, appliedHex: toHex(map) });
        remapMessage(
          restore
            ? "Factory keymap restored. The keyboard acknowledged the complete update."
            : "Keymap applied. The keyboard acknowledged the complete update. Try your remapped keys.",
        );
      } catch (error) {
        patch({ appliedHex: null });
        remapMessage(error.message, true);
      } finally {
        end();
      }
    },
    exportDraft() {
      return {
        format: "lofree-edge-keymap-draft-v1",
        savedAt: new Date().toISOString(),
        profile: 0,
        source: "command08-current-map",
        keymapHex: toHex(state.draft),
        remappedKeys: countChanges(state.draft),
        firmwareReadback: true,
      };
    },
    dispose() {
      active = false;
      ++imageGeneration;
      ++catalogGeneration;
      listening = false;
      hid?.removeEventListener("disconnect", onDisconnect);
      // Navigation is guarded during transfer. Never close a transport mid-write.
      if (!state.busy) {
        void state.connection?.close().catch(() => {});
        void state.updateConnection?.close().catch(() => {});
      }
      listeners.clear();
    },
  };
}
