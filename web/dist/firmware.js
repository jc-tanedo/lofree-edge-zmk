// Telink OTA packets, matched against tools/flash_edge_trial.py and its hardware log.
export function crc16(bytes) {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xa001 : 0);
  }
  return crc;
}

export function telinkCrc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return crc >>> 0;
}

export function otaFrame(command, data = new Uint8Array(), chunk = false) {
  if (!Number.isInteger(command) || command < 0 || command > 0xffff || data.length > 16 || (chunk && data.length !== 16)) throw new Error('Invalid firmware frame.');
  const payload = new Uint8Array(2 + data.length + (chunk ? 2 : 0));
  const view = new DataView(payload.buffer);
  view.setUint16(0, command, true);
  payload.set(data, 2);
  if (chunk) view.setUint16(18, crc16(payload.subarray(0, 18)), true);
  const frame = new Uint8Array(33);
  frame.set([5, payload.length + 9, 1, payload.length + 7, payload.length + 3, 4, 0x52, 0x28, 0]);
  frame.set(payload, 9);
  return frame;
}

export async function validateFirmware(input, approved) {
  // Copy before awaiting so a caller cannot mutate bytes after verification.
  const bytes = Uint8Array.from(input);
  if (bytes.length < 36 || bytes.length > 0x20000 || bytes.length % 16 !== 4) throw new Error('Invalid Telink firmware size.');
  const view = new DataView(bytes.buffer);
  if (String.fromCharCode(...bytes.slice(8, 12)) !== 'KNLT' || view.getUint32(24, true) !== bytes.length) throw new Error('Invalid Telink firmware header.');
  if (view.getUint32(bytes.length - 4, true) !== telinkCrc32(bytes.subarray(0, -4))) throw new Error('Firmware checksum failed.');
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
  if (!approved || approved.size !== bytes.length || approved.sha256 !== hash || approved.board !== 'lofree_edge') throw new Error('This image does not match an approved Lofree Edge build.');
  return bytes;
}

function exchange(device, frame, expected, timeout = 3000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      device.removeEventListener('inputreport', onReport);
      navigator.hid?.removeEventListener('disconnect', onDisconnect);
      if (error) reject(error); else resolve();
    };
    const onDisconnect = event => { if (event.device === device) finish(new Error('Keyboard disconnected during the update.')); };
    const onReport = event => {
      if (event.device !== device || event.reportId !== 5) return;
      const bytes = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
      if (bytes.length !== 32 || bytes[1] !== 1 || bytes[4] !== 4 || bytes[5] !== 0x52 || bytes[6] !== 0x28 || bytes[7] !== 0) return;
      if (bytes[28] !== 0) return finish(new Error(`Firmware update refused (status ${bytes[28]}).`));
      if (!expected.includes(bytes[8] | bytes[9] << 8)) return;
      finish();
    };
    const timer = setTimeout(() => finish(new Error('Firmware acknowledgement timed out. Update stopped without retrying.')), timeout);
    device.addEventListener('inputreport', onReport);
    navigator.hid?.addEventListener('disconnect', onDisconnect);
    device.sendReport(5, frame.slice(1)).catch(finish);
  });
}

export async function flashFirmware(connection, input, approved, progress = () => {}) {
  const image = await validateFirmware(input, approved);
  await connection.verifyForFirmwareUpdate();
  const device = connection.device;
  // No VERSION, CONFIRM, or UNLOCK command. Only stock -> inactive ZMK slot.
  await exchange(device, otaFrame(0xff01), [0, 0xff01]);
  const last = Math.floor(image.length / 16);
  for (let index = 0; index <= last; index++) {
    const block = new Uint8Array(16).fill(255);
    block.set(image.slice(index * 16, index * 16 + 16));
    await exchange(device, otaFrame(index, block, true), [index + 1]);
    progress(index + 1, last + 1);
  }
  const end = new Uint8Array(4);
  const view = new DataView(end.buffer);
  view.setUint16(0, last, true);
  view.setUint16(2, last ^ 0xffff, true);
  // Like the validated CLI, send END once. The restart can precede its response.
  try { await device.sendReport(5, otaFrame(0xff02, end).slice(1)); }
  catch { throw new Error('Every block was acknowledged, but restart confirmation was lost. Check the keyboard before trying another update.'); }
}
