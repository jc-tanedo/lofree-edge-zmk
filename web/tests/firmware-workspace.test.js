import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspace } from "../firmware/workspace.js";
import { factoryMap, remapKey, hasPendingChanges } from "../dist/keymap.js";
import { KEY_LAYOUT } from "../dist/layout.js";
import { telinkCrc32 } from "../dist/firmware.js";

async function fixture({ verify, flash, fetcher } = {}) {
  const image = new Uint8Array(36).fill(0xa5);
  image.set([75, 78, 76, 84], 8);
  const view = new DataView(image.buffer);
  view.setUint32(24, image.length, true);
  view.setUint32(32, telinkCrc32(image.subarray(0, 32)), true);
  const sha256 = Buffer.from(
    await crypto.subtle.digest("SHA-256", image),
  ).toString("hex");
  const builds = ["a", "b"].map((id) => ({
    file: `edge-${id}.ota.bin`,
    label: id,
    size: 36,
    board: "lofree_edge",
    sha256,
  }));
  const hid = new EventTarget(),
    target = new EventTarget(),
    entries = new Map();
  const storage = {
    getItem: (key) => entries.get(key),
    setItem: (key, value) => entries.set(key, value),
  };
  let writes = 0,
    requested = 0;
  const key = KEY_LAYOUT.find((k) => k.triple[0] === 0x20);
  const mapped = remapKey(factoryMap(), key.id, [0x20, 0, 0x04]);
  let current;
  const request = async () => {
    requested++;
    return (current = {
      device: {
        opened: true,
        productName: "Synthetic Edge",
        vendorId: 0x05ac,
        productId: 0x0256,
      },
      verifyForFirmwareUpdate: verify || (async () => {}),
      close: async () => {
        current.device.opened = false;
      },
      read: async (_offset, length) => ({
        data: new Uint8Array(length),
        request: new Uint8Array(),
        response: new Uint8Array(),
      }),
      loadKeymap: async () => mapped.slice(),
      applyKeymap: async () => {
        writes++;
      },
    });
  };
  const workspace = createWorkspace({
    hid,
    secure: true,
    request,
    target,
    storage,
    flash:
      flash ||
      (async () => {
        writes++;
      }),
    fetcher:
      fetcher ||
      (async (file) =>
        file.endsWith("manifest.json")
          ? {
              ok: true,
              json: async () => ({
                format: "lofree-edge-browser-firmware-v1",
                builds,
              }),
            }
          : { ok: true, arrayBuffer: async () => image.buffer.slice(0) }),
  });
  workspace.start();
  return {
    workspace,
    image,
    builds,
    hid,
    key,
    get current() {
      return current;
    },
    get writes() {
      return writes;
    },
    get requested() {
      return requested;
    },
  };
}

test("React workspace only exposes verified connection and never flashes without acknowledgment", async () => {
  let release;
  const verified = new Promise((resolve) => {
    release = resolve;
  });
  const f = await fixture({ verify: () => verified });
  await f.workspace.loadCatalog();
  const connecting = f.workspace.connectUpdate();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.workspace.getSnapshot().verified, false);
  release();
  await connecting;
  assert.equal(f.workspace.getSnapshot().verified, true);
  await f.workspace.install(false);
  assert.equal(f.writes, 0);
  await f.workspace.install(true);
  assert.equal(f.writes, 1);
  assert.equal(f.workspace.getSnapshot().verified, false);
  assert.match(f.workspace.getSnapshot().firmwareStatus, /Transfer complete/);
  f.workspace.dispose();
});

test("stock assignments are read from device and resetting a remapped key enables apply", async () => {
  const f = await fixture();
  await f.workspace.connectStock();
  const original = f.workspace.getSnapshot().appliedHex;
  assert.equal(
    hasPendingChanges(f.workspace.getSnapshot().draft, original),
    false,
  );
  f.workspace.selectKey(f.key);
  f.workspace.assign(f.key.triple);
  assert.equal(
    hasPendingChanges(f.workspace.getSnapshot().draft, original),
    true,
  );
  await f.workspace.apply();
  assert.equal(f.writes, 1);
  assert.equal(
    hasPendingChanges(
      f.workspace.getSnapshot().draft,
      f.workspace.getSnapshot().appliedHex,
    ),
    false,
  );
  f.workspace.dispose();
});

test("disconnect removes verification and install failure restores controls and records failure", async () => {
  const f = await fixture({
    flash: async () => {
      throw new Error("No acknowledgment");
    },
  });
  await f.workspace.loadCatalog();
  await f.workspace.connectUpdate();
  const event = new Event("disconnect");
  Object.assign(event, { device: f.current.device });
  f.hid.dispatchEvent(event);
  assert.equal(f.workspace.getSnapshot().verified, false);
  await f.workspace.install(true);
  assert.equal(f.writes, 0);
  await f.workspace.connectUpdate();
  await f.workspace.install(true);
  assert.equal(f.workspace.getSnapshot().busy, false);
  assert.equal(f.workspace.getSnapshot().firmwareError, true);
  assert.match(f.workspace.getSnapshot().firmwareStatus, /No acknowledgment/);
  f.workspace.dispose();
});

test("a late image download cannot replace the selected verified image", async () => {
  const first = await fixture();
  let release;
  const paused = new Promise((resolve) => {
    release = resolve;
  });
  const f = await fixture({
    fetcher: async (file) =>
      file.endsWith("manifest.json")
        ? {
            ok: true,
            json: async () => ({
              format: "lofree-edge-browser-firmware-v1",
              builds: first.builds,
            }),
          }
        : {
            ok: true,
            arrayBuffer: async () => {
              if (file.includes("edge-a")) await paused;
              return first.image.buffer.slice(0);
            },
          },
  });
  const loading = f.workspace.loadCatalog();
  await new Promise((resolve) => setImmediate(resolve));
  await f.workspace.selectBuild("edge-b.ota.bin");
  release();
  await loading;
  assert.equal(f.workspace.getSnapshot().approved.file, "edge-b.ota.bin");
  f.workspace.dispose();
  first.workspace.dispose();
});

test("large transfers keep UI notifications bounded without dropping final progress", async () => {
  const f = await fixture({
    flash: async (_conn, _image, _build, progress) => {
      for (let done = 1; done <= 10000; done++) progress(done, 10000);
    },
  });
  await f.workspace.loadCatalog();
  await f.workspace.connectUpdate();
  let notifications = 0;
  f.workspace.subscribe(() => notifications++);
  await f.workspace.install(true);
  assert.equal(f.workspace.getSnapshot().progress, 1);
  assert.ok(
    notifications < 1000,
    `UI received ${notifications} updates for 10000 blocks`,
  );
  f.workspace.dispose();
});
