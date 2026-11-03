import assert from "node:assert/strict";
import test from "node:test";
import {
  automaticInstall,
  verificationPending,
  verifyAndAccept,
  command,
  findInstalledDevice,
} from "../dist/firmware-acceptance.js";
const build = {
  size: 100,
  sha256: "a".repeat(64),
  installation: {
    mode: "automatic",
    hardwareValidatedSha256: "a".repeat(64),
    identityReport: 1,
    crc32: 123,
  },
};
function fixture({
  badIdentity = false,
  refused,
  failedTest = false,
  failReadback = false,
  accepted = false,
} = {}) {
  const d = new EventTarget(),
    sent = [];
  let confirmed = accepted,
    reads = 0;
  Object.assign(d, {
    vendorId: 0x1d50,
    productId: 0x615e,
    productName: "Lofree Edge ZMK",
    opened: false,
    collections: [
      {
        usagePage: 0xff00,
        inputReports: [{ reportId: 5 }],
        outputReports: [{ reportId: 5 }],
      },
    ],
    open: async () => {
      d.opened = true;
    },
    close: async () => {
      d.opened = false;
    },
    receiveFeatureReport: async () => {
      const a = new Uint8Array(16),
        v = new DataView(a.buffer);
      a.set([10, 69, 73, 1]);
      v.setUint32(4, badIdentity ? 99 : 100, true);
      v.setUint32(8, 123, true);
      return new DataView(a.buffer);
    },
    sendReport: async (id, payload) => {
      assert.equal(id, 5);
      const code = payload[8] | (payload[9] << 8);
      sent.push(code);
      if (code === 0xff03) confirmed = true;
      if (code === 0xff00) reads++;
      const full = new Uint8Array(33);
      full.set([5, 11, 1, 9, 5, 4, 0x52, 0x28, 0]);
      full[9] = code & 255;
      full[10] = code >> 8;
      full[21] = 90;
      full[22] = 67;
      full[18] =
        2 | (confirmed ? 4 : 0) | (code === 0xff07 && !failedTest ? 8 : 0);
      full[17] = confirmed ? 0 : 1;
      full[30] = 0x41;
      if (refused === code) full[29] = 12;
      if (failReadback && reads === 2) full[18] = 2;
      const e = new Event("inputreport");
      Object.assign(e, {
        device: d,
        reportId: 5,
        data: new DataView(full.buffer, 1, 32),
      });
      d.dispatchEvent(e);
    },
  });
  return { d, sent };
}
test("only exact validated policy permits automatic acceptance", () => {
  assert(automaticInstall(build));
  assert(!automaticInstall({ ...build, installation: { mode: "trial" } }));
  assert(!automaticInstall({ ...build, sha256: "b".repeat(64) }));
  assert(
    !automaticInstall({
      ...build,
      installation: { ...build.installation, crc32: undefined },
    }),
  );
});
test("identity, health, self-test, confirmation and independent readback complete in order", async () => {
  const { d, sent } = fixture();
  await verifyAndAccept(d, build);
  assert.deepEqual(sent, [0xff00, 0xff07, 0xff03, 0xff00]);
  assert(!d.opened);
});
test("wrong image sends no write commands", async () => {
  const { d, sent } = fixture({ badIdentity: true });
  await assert.rejects(verifyAndAccept(d, build), /does not match/);
  assert.deepEqual(sent, []);
  assert(!d.opened);
});
test("failed/refused self-test never sends confirmation", async () => {
  for (const options of [
    { failedTest: true },
    { refused: 0xff07 },
    { refused: 0xff00 },
  ]) {
    const { d, sent } = fixture(options);
    await assert.rejects(verifyAndAccept(d, build));
    assert(!sent.includes(0xff03));
    assert(!d.opened);
  }
});
test("accepted image is verified idempotently without another flash self-test", async () => {
  const { d, sent } = fixture({ accepted: true });
  await verifyAndAccept(d, build);
  assert.deepEqual(sent, [0xff00]);
});
test("failed acceptance readback cannot report completion", async () => {
  const { d } = fixture({ failReadback: true });
  await assert.rejects(verifyAndAccept(d, build), /acceptance could not/);
});
test("timeout removes report listeners and never retries a write", async () => {
  const { d } = fixture();
  let writes = 0;
  d.sendReport = async () => {
    writes++;
  };
  await assert.rejects(command(d, 0xff03, 5), /timed out/);
  assert.equal(writes, 1);
});
test("development image cannot run the self-test", async () => {
  const { d, sent } = fixture();
  await assert.rejects(
    verifyAndAccept(d, { ...build, installation: { mode: "trial" } }),
    /trial/,
  );
  assert.deepEqual(sent, []);
});
test("automatic reconnect never prompts without a user gesture; chooser handles multiple devices", async () => {
  const { d } = fixture();
  let prompts = 0;
  const hid = {
    getDevices: async () => [d],
    requestDevice: async () => {
      prompts++;
      return [d];
    },
  };
  assert.equal(await findInstalledDevice(hid), d);
  assert.equal(prompts, 0);
  hid.getDevices = async () => [d, d];
  await assert.rejects(findInstalledDevice(hid), /Multiple/);
  assert.equal(await findInstalledDevice(hid, true), d);
  assert.equal(prompts, 1);
});

test("only interrupted automatic verification can resume; partial transfers never resume writing", () => {
  assert(verificationPending({ automatic: true, state: "verifying" }));
  assert(
    verificationPending({
      automatic: true,
      state: "transferring",
      completed: 3,
      total: 3,
    }),
  );
  assert(
    !verificationPending({
      automatic: true,
      state: "transferring",
      completed: 2,
      total: 3,
    }),
  );
  assert(
    !verificationPending({ automatic: false, state: "restart-requested" }),
  );
  assert(!verificationPending({ automatic: true, state: "complete" }));
});
