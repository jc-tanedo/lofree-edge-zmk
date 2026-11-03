import assert from "node:assert/strict";
import test from "node:test";
import { createWorkspace } from "../firmware/workspace.js";
import { factoryMap, remapKey, hasPendingChanges } from "../dist/keymap.js";
import { KEY_LAYOUT } from "../dist/layout.js";
import { telinkCrc32 } from "../dist/firmware.js";

async function fixture({
  verify,
  flash,
  fetcher,
  automatic = false,
  accept,
  installedDevice,
} = {}) {
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
  if (automatic)
    for (const build of builds)
      build.installation = {
        mode: "automatic",
        hardwareValidatedSha256: build.sha256,
        identityReport: 2,
        crc32: 123,
      };
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
    ...(accept ? { accept } : {}),
    ...(installedDevice ? { installedDevice } : {}),
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

test("automatic install completes only after verification; trial never calls acceptance", async () => {
  let checks = 0;
  const f = await fixture({
    automatic: true,
    installedDevice: async () => ({}),
    accept: async () => {
      checks++;
    },
  });
  await f.workspace.loadCatalog();
  await f.workspace.connectUpdate();
  await f.workspace.install(false);
  assert.equal(checks, 0);
  await f.workspace.install(true);
  assert.equal(checks, 1);
  assert.match(
    f.workspace.getSnapshot().firmwareStatus,
    /Installation complete/,
  );
  f.workspace.dispose();
  const trial = await fixture({
    installedDevice: async () => {
      throw Error("Should not connect");
    },
  });
  await trial.workspace.loadCatalog();
  await trial.workspace.connectUpdate();
  await trial.workspace.install(true);
  assert.match(
    trial.workspace.getSnapshot().firmwareStatus,
    /Development trial/,
  );
  trial.workspace.dispose();
});
test("interrupted verification resumes with fresh acknowledgment and never reflashes", async () => {
  let checks = 0,
    selected = [];
  const f = await fixture({
    automatic: true,
    installedDevice: async (choose) => {
      selected.push(choose);
      return {};
    },
    accept: async () => {
      if (!checks++) throw Error("Disconnected");
    },
  });
  await f.workspace.loadCatalog();
  await f.workspace.connectUpdate();
  await f.workspace.install(true);
  assert.equal(f.workspace.getSnapshot().lastAttempt.state, "needs-attention");
  const writes = f.writes;
  await f.workspace.resumeInstallation(false);
  assert.equal(checks, 1);
  await f.workspace.resumeInstallation(true);
  assert.equal(checks, 2);
  assert.equal(f.writes, writes);
  assert.deepEqual(selected, [false, true]);
  assert.match(
    f.workspace.getSnapshot().firmwareStatus,
    /Installation complete/,
  );
  f.workspace.dispose();
});

test("lost END delivery after all block acknowledgments offers verification, not an automatic reflash", async () => {
  const f = await fixture({
    automatic: true,
    flash: async (_c, _i, _b, progress) => {
      progress(3, 3);
      throw Error("Restart confirmation lost");
    },
  });
  await f.workspace.loadCatalog();
  await f.workspace.connectUpdate();
  await f.workspace.install(true);
  assert.equal(f.workspace.getSnapshot().lastAttempt.state, "needs-attention");
  f.workspace.dispose();
});

test("reload exposes interrupted verification without executing acceptance", async () => {
  const f = await fixture({
    automatic: true,
    installedDevice: async () => ({}),
    accept: async () => {
      throw Error("Disconnected");
    },
  });
  await f.workspace.loadCatalog();
  await f.workspace.connectUpdate();
  await f.workspace.install(true);
  const attempt = f.workspace.getSnapshot().lastAttempt;
  f.workspace.dispose();
  let accepts = 0;
  const restored = createWorkspace({
    hid: new EventTarget(),
    secure: true,
    target: new EventTarget(),
    storage: {
      getItem: () =>
        JSON.stringify({
          ...attempt,
          format: "lofree-edge-firmware-attempt-v1",
        }),
    },
    accept: async () => {
      accepts++;
    },
  });
  restored.start();
  assert.equal(restored.getSnapshot().lastAttempt.state, "needs-attention");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(accepts, 0);
  restored.dispose();
});

test("removed catalog approval refuses resumption visibly", async () => {
  const f = await fixture({
    automatic: true,
    installedDevice: async () => ({}),
    accept: async () => {
      throw Error("Disconnected");
    },
  });
  await f.workspace.loadCatalog();
  await f.workspace.connectUpdate();
  await f.workspace.install(true);
  f.builds[0].installation.mode = "trial";
  await f.workspace.resumeInstallation(true);
  assert.match(f.workspace.getSnapshot().firmwareStatus, /not approved/);
  f.workspace.dispose();
});

test("approved existing installation can finish without an upload receipt or reflashing", async () => {
  let accepts = 0,
    choices = [];
  const f = await fixture({
    automatic: true,
    installedDevice: async (choose) => {
      choices.push(choose);
      return {};
    },
    accept: async () => {
      accepts++;
    },
  });
  await f.workspace.loadCatalog();
  await f.workspace.resumeInstallation(false);
  assert.equal(accepts, 0);
  await f.workspace.resumeInstallation(true);
  assert.equal(accepts, 1);
  assert.equal(f.writes, 0);
  assert.deepEqual(choices, [true]);
  assert.match(
    f.workspace.getSnapshot().firmwareStatus,
    /Installation complete/,
  );
  f.workspace.dispose();
});
test("unapproved existing trial cannot finish without receipt", async () => {
  let choices = 0;
  const f = await fixture({
    installedDevice: async () => {
      choices++;
      return {};
    },
  });
  await f.workspace.loadCatalog();
  await f.workspace.resumeInstallation(true);
  assert.equal(choices, 0);
  assert.match(f.workspace.getSnapshot().firmwareStatus, /not approved/);
  f.workspace.dispose();
});

test("wizard stays busy after upload and exposes real finalization phases", async () => {
  let reconnect, verify;
  const connection = new Promise((resolve) => {
    reconnect = resolve;
  });
  const done = new Promise((resolve) => {
    verify = resolve;
  });
  const f = await fixture({
    automatic: true,
    installedDevice: async () => connection,
    accept: async (_d, _b, phase) => {
      phase("Verifying", "verifying");
      await done;
      phase("Testing", "testing");
      phase("Accepting", "accepting");
    },
  });
  await f.workspace.loadCatalog();
  await f.workspace.connectUpdate();
  const phases = [];
  f.workspace.subscribe(() =>
    phases.push(f.workspace.getSnapshot().installPhase),
  );
  const installation = f.workspace.install(true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(f.workspace.getSnapshot().installPhase, "reconnecting");
  assert(f.workspace.getSnapshot().busy);
  assert.equal(f.workspace.getSnapshot().progress, null);
  reconnect({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(f.workspace.getSnapshot().installPhase, "verifying");
  assert(f.workspace.getSnapshot().busy);
  verify();
  await installation;
  assert(phases.includes("testing"));
  assert(phases.includes("accepting"));
  assert.equal(f.workspace.getSnapshot().installPhase, "complete");
  assert(!f.workspace.getSnapshot().busy);
  f.workspace.dispose();
});
test("missing post-restart permission is a recoverable wizard handoff", async () => {
  const f = await fixture({
    automatic: true,
    installedDevice: async () => {
      const error = Error("Allow access");
      error.code = "device-permission";
      throw error;
    },
  });
  await f.workspace.loadCatalog();
  await f.workspace.connectUpdate();
  await f.workspace.install(true);
  assert.equal(f.workspace.getSnapshot().installPhase, "permission-needed");
  assert(!f.workspace.getSnapshot().busy);
  assert(!f.workspace.getSnapshot().firmwareError);
  assert.equal(f.workspace.getSnapshot().lastAttempt.state, "needs-attention");
  f.workspace.dispose();
});

test("upload error can return to connection review without retrying writes", async () => {
  const f = await fixture({
    flash: async () => {
      throw Error("Transfer stopped");
    },
  });
  await f.workspace.loadCatalog();
  await f.workspace.connectUpdate();
  await f.workspace.install(true);
  assert.equal(f.workspace.getSnapshot().installPhase, "upload-error");
  const writes = f.writes;
  f.workspace.reviewConnection();
  assert.equal(f.workspace.getSnapshot().installPhase, "idle");
  assert.equal(f.writes, writes);
  f.workspace.dispose();
});
