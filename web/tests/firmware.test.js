import assert from 'node:assert/strict';
import test from 'node:test';
import { flashFirmware, validateFirmware, otaFrame, crc16 } from '../dist/firmware.js';

// Synthetic non-executable image, not a vendor or hardware-tested payload.
const image = new Uint8Array(57796).fill(0xa5);
image.set([75,78,76,84],8);
new DataView(image.buffer).setUint32(24,image.length,true);
new DataView(image.buffer).setUint32(image.length-4,488532700,true);
const approved = {board:'lofree_edge',size:image.length,sha256:'37949fd1deb225fa1489a5f2bef0a71ee2746f3bfc2d3a49a3df1ad9cfa6f275'};
const hid = new EventTarget();
Object.defineProperty(globalThis, 'navigator', { value: { hid }, configurable: true });

function fakeConnection({ refusedAt = -1, missingAt = -1, failPreflight = false } = {}) {
  const device = new EventTarget();
  const sent = [];
  let count = 0;
  device.sendReport = async (id, payload) => {
    assert.equal(id, 5);
    assert.equal(payload.length, 32);
    sent.push(Uint8Array.of(id, ...payload));
    const index = payload[8] | payload[9] << 8;
    if (index === 0xff02) return;
    if (count++ === missingAt) return;
    const reply = payload.slice();
    const next = index === 0xff01 ? 0 : index + 1;
    reply[8] = next & 255;
    reply[9] = next >> 8;
    if (sent.length - 1 === refusedAt) reply[28] = 7;
    const event = new Event('inputreport');
    // DataView offset is intentional: WebHID need not provide a fresh buffer.
    const buffer = new Uint8Array(40);
    buffer.set(reply, 4);
    Object.assign(event, { device, reportId: 5, data: new DataView(buffer.buffer, 4, 32) });
    device.dispatchEvent(event);
  };
  return { device, sent, verifyForFirmwareUpdate: async () => { if (failPreflight) throw new Error('Stock verification failed'); } };
}

test('browser image validation accepts a checksummed synthetic Edge-shaped image', async () => {
  assert.deepEqual(await validateFirmware(image, approved), image);
  const corrupted = image.slice();
  corrupted[100] ^= 1;
  await assert.rejects(validateFirmware(corrupted, approved), /checksum/);
  await assert.rejects(validateFirmware(image, { ...approved, board: 'another_board' }), /approved/);
  await assert.rejects(validateFirmware(image, { ...approved, sha256: '0'.repeat(64) }), /approved/);
});

test('browser encoder matches fixed protocol marker and CRC vectors', () => {
  assert.equal(Buffer.from(otaFrame(0xff01)).toString('hex'), '050b0109050452280001ff'+'00'.repeat(22));
  assert.equal(crc16(new TextEncoder().encode('123456789')),0x4b37);
});

test('flashing waits for every acknowledgement and sends END exactly once', async () => {
  const connection = fakeConnection();
  let count = 0;
  await flashFirmware(connection, image, approved, (done, total) => { count = done; assert.equal(total, 3613); });
  assert.equal(count, 3613);
  assert.equal(connection.sent.length, 3615);
  assert.equal(connection.sent.at(-1)[9] | connection.sent.at(-1)[10] << 8, 0xff02);
  assert(!connection.sent.some(frame => [0xff00, 0xff03, 0xff05].includes(frame[9] | frame[10] << 8)));
});

test('device refusal stops without finalizing or retrying', async () => {
  const connection = fakeConnection({ refusedAt: 2 });
  await assert.rejects(flashFirmware(connection, image, approved), /refused/);
  assert.equal(connection.sent.length, 3);
  assert(!connection.sent.some(frame => frame[9] === 2 && frame[10] === 255));
});

test('lost acknowledgements stop without finalizing or retrying', async () => {
  const connection = fakeConnection({ missingAt: 1 });
  await assert.rejects(flashFirmware(connection, image, approved), /timed out/);
  assert.equal(connection.sent.length, 2);
});

test('an invalid image or failed stock preflight cannot start a transfer', async () => {
  const connection = fakeConnection({ failPreflight: true });
  await assert.rejects(flashFirmware(connection, image, approved), /Stock verification/);
  assert.equal(connection.sent.length, 0);
  await assert.rejects(flashFirmware(connection, image, { ...approved, size: 99 }), /approved/);
  assert.equal(connection.sent.length, 0);
});
