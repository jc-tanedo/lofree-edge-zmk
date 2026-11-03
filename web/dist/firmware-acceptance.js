// SPDX-License-Identifier: GPL-3.0-or-later
import { otaFrame } from "./firmware.js";
export const ZMK_FILTER = Object.freeze({
  vendorId: 0x1d50,
  productId: 0x615e,
  usagePage: 0xff00,
});
export const automaticInstall = (build) =>
  build?.installation?.mode === "automatic" &&
  build.installation.hardwareValidatedSha256 === build.sha256 &&
  build.installation.identityReport === 1 &&
  Number.isInteger(build.installation.crc32) &&
  build.installation.crc32 >= 0 &&
  build.installation.crc32 <= 0xffffffff;
export const verificationPending = (attempt) =>
  Boolean(
    attempt?.automatic &&
      (["verifying", "needs-attention", "restart-requested"].includes(
        attempt.state,
      ) ||
        (attempt.state === "transferring" &&
          attempt.total > 0 &&
          attempt.completed === attempt.total)),
  );
const matches = (d) =>
  d.vendorId === ZMK_FILTER.vendorId &&
  d.productId === ZMK_FILTER.productId &&
  d.productName === "Lofree Edge ZMK" &&
  // The command collection uses Generic Desktop; identity features are in
  // separate vendor collections on the same HID interface.
  d.collections.some((c) => c.usagePage === 0xff00) &&
  d.collections.some(
    (c) =>
      c.outputReports.some((r) => r.reportId === 5) &&
      c.inputReports.some((r) => r.reportId === 5),
  );
export async function findInstalledDevice(
  hid,
  choose = false,
  wait = (ms) => new Promise((r) => setTimeout(r, ms)),
) {
  if (choose) {
    const selected = await hid.requestDevice({ filters: [ZMK_FILTER] });
    if (selected.length === 0)
      throw new Error(
        "No keyboard selected. Choose Finalize Installation to try again.",
      );
    const devices = selected.filter(matches);
    if (selected.length !== 1 || devices.length !== 1)
      throw new Error(
        "Select one Lofree Edge ZMK interface with both update and identity reports.",
      );
    return devices[0];
  }
  for (let i = 0; i < 40; i++) {
    const devices = (await hid.getDevices()).filter(matches);
    if (devices.length > 1)
      throw new Error(
        "Multiple Edge keyboards found. Finalize Installation to select the one being updated.",
      );
    if (devices.length === 1) return devices[0];
    await wait(500);
  }
  throw new Error(
    "Reconnect the keyboard in ON mode, then Finalize Installation and allow access to its ZMK interface.",
  );
}
async function boundedRead(promise, timeout = 3000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Firmware identity read timed out.")),
          timeout,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export function command(device, code, timeout = 3000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (error, bytes) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      device.removeEventListener("inputreport", report);
      error ? reject(error) : resolve(bytes);
    };
    const report = (e) => {
      if (e.device !== device || e.reportId !== 5) return;
      const b = new Uint8Array(
        e.data.buffer,
        e.data.byteOffset,
        e.data.byteLength,
      );
      if (
        b.length !== 32 ||
        b[1] !== 1 ||
        b[4] !== 4 ||
        b[5] !== 0x52 ||
        b[6] !== 0x28 ||
        b[7] !== 0 ||
        (b[8] | (b[9] << 8)) !== code
      )
        return;
      if (b[28] !== 0)
        return finish(
          new Error(`Firmware verification refused (status ${b[28]}).`),
        );
      // Return CLI offsets including report ID, without retaining payloads in storage.
      const full = new Uint8Array(33);
      full[0] = 5;
      full.set(b, 1);
      finish(null, full);
    };
    const timer = setTimeout(
      () => finish(new Error("Firmware verification timed out.")),
      timeout,
    );
    device.addEventListener("inputreport", report);
    Promise.resolve()
      .then(() => device.sendReport(5, otaFrame(code).slice(1)))
      .catch((e) => finish(e));
  });
}
export function health(bytes) {
  if (
    bytes[21] !== 90 ||
    bytes[22] !== 67 ||
    !(bytes[18] & 2) ||
    !(bytes[30] & 0x40) ||
    !(bytes[30] & 1)
  )
    throw new Error(
      "Firmware health or retained-image integrity check failed. Installation was not accepted.",
    );
  if (bytes[18] & 16 || bytes[25] & 6)
    throw new Error(
      "Boot/flash health check failed. Installation was not accepted.",
    );
  return {
    accepted: Boolean(bytes[18] & 4),
    count: bytes[17],
    slot: bytes[30] & 0x80 ? 0x20000 : 0,
  };
}
export async function verifyAndAccept(device, build, phase = () => {}) {
  if (!automaticInstall(build))
    throw new Error("This development build must remain a trial.");
  if (!matches(device)) throw new Error("Unsupported firmware interface.");
  try {
    if (!device.opened) await device.open();
    phase("Verifying installed firmware…");
    const data = await boundedRead(device.receiveFeatureReport(10));
    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (
      bytes.length !== 16 ||
      bytes[0] !== 10 ||
      bytes[1] !== 69 ||
      bytes[2] !== 73 ||
      bytes[3] !== 1 ||
      v.getUint32(4, true) !== build.size ||
      v.getUint32(8, true) !== build.installation.crc32
    )
      throw new Error(
        "The running image does not match this installation. It was not accepted.",
      );
    const slot = v.getUint32(12, true);
    let info = health(await command(device, 0xff00));
    if (![0, 0x20000].includes(slot) || slot !== info.slot)
      throw new Error("Running firmware slot verification failed.");
    if (info.accepted && info.count === 0) return;
    phase("Testing firmware storage…");
    const tested = await command(device, 0xff07, 5000);
    health(tested);
    if (!(tested[18] & 8))
      throw new Error("Firmware storage self-test did not pass.");
    phase("Finishing installation…");
    health(await command(device, 0xff03));
    info = health(await command(device, 0xff00));
    if (!info.accepted || info.count !== 0)
      throw new Error("Firmware acceptance could not be verified.");
  } finally {
    if (device.opened) await device.close();
  }
}
