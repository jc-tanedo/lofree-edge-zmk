import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildReadRequest, parseReadResponse, toHex } from '../dist/protocol.js';
import { EdgeConnection, isSupportedEdge } from '../dist/webhid.js';
import { decodeProfile } from '../dist/profile.js';

function fakeDevice() {
  const device = new EventTarget();
  const report = { reportId: 4, items: [{ reportSize: 8, reportCount: 63 }] };
  Object.assign(device, {
    vendorId: 0x05ac, productId: 0x0256, productName: 'EDGE84@Lofree', opened: true,
    collections: [{ usagePage: 0xff1c, usage: 0x92, inputReports: [report], outputReports: [report] }],
    open: async () => { device.opened = true; }, close: async () => { device.opened = false; },
    sendReport: async () => {},
  });
  return device;
}

function emit(device, reportId, payload) {
  const event = new Event('inputreport');
  // Exercise a DataView whose backing buffer starts before the report payload.
  const buffer = new Uint8Array(payload.length + 12);
  buffer.set(payload, 7);
  Object.assign(event, { device, reportId, data: new DataView(buffer.buffer, 7, payload.length) });
  device.dispatchEvent(event);
}

test('browser flasher verifies normal stock and refuses the obsolete GPIO probe', async () => {
  const device = fakeDevice();
  const ota = { reportId: 5, items: [{ reportSize: 8, reportCount: 32 }] };
  device.collections[0].inputReports.push(ota);
  device.collections[0].outputReports.push(ota);
  let probe = false;
  device.sendReport = async (id, payload) => {
    assert.equal(id, 4);
    assert.equal(payload[2], 0x1b);
    const reply = Uint8Array.of(4, ...payload);
    reply.set(probe ? new Uint8Array(16).fill(0xff) : [0,1,2,3,4,5,6,7,8,9,10,11,12,13,44,15], 8);
    emit(device, 4, reply.slice(1));
  };
  const connection = new EdgeConnection(device);
  await connection.verifyForFirmwareUpdate();
  probe = true;
  await assert.rejects(connection.verifyForFirmwareUpdate(), /Stock firmware verification failed/);
});

test('read vectors preserve observed packet headers with synthetic response data', async () => {
  for (const name of ['read-profile-index', 'read-config-0000-56', 'read-config-0038-15']) {
    const capture = JSON.parse(await readFile(new URL(`./fixtures/${name}.json`, import.meta.url)));
    assert.equal(toHex(buildReadRequest(capture.offset, capture.length)), capture.request_hex);
    assert.equal(toHex(parseReadResponse(Uint8Array.from(Buffer.from(capture.response_hex, 'hex')), capture.offset, capture.length)), capture.data_hex);
  }
});

test('request validation and checksum carry', () => {
  assert.equal(toHex(buildReadRequest(0x12fe, 56)).slice(0, 16), '044d010538fe1200');
  for (const [offset, length] of [[-1, 1], [65535, 2], [0, 0], [0, 57], [0, 1.5], [NaN, 1]]) {
    assert.throws(() => buildReadRequest(offset, length), RangeError);
  }
  const wrongStatus = buildReadRequest(0, 1);
  wrongStatus[7] = 255;
  assert.throws(() => parseReadResponse(wrongStatus, 0, 1), /status/);
});

test('keyboard profile mapping uses block-relative offsets and reverses speed', () => {
  const block = new Uint8Array(34);
  block[2] = 2;
  block[3] = 1;
  block[26] = 2;
  assert.deepEqual(decodeProfile(block), { selector: 0, brightness: 2, effectSpeed: 3, lightingModeCode: 2 });
  block[2] = 255;
  block[3] = 255;
  assert.equal(decodeProfile(block).brightness, null);
  assert.equal(decodeProfile(block).effectSpeed, null);
});

test('protected keyboard collection does not qualify as the vendor interface', () => {
  const device = fakeDevice();
  assert.equal(isSupportedEdge(device), true);
  device.collections[0].usagePage = 1;
  device.collections[0].usage = 6;
  assert.equal(isSupportedEdge(device), false);
  assert.throws(() => new EdgeConnection(device), /configuration channel/);
});

test('WebHID sends ID separately and reconstructs the 64-byte response', async () => {
  const device = fakeDevice();
  const connection = new EdgeConnection(device);
  device.sendReport = async (id, payload) => {
    assert.equal(id, 4);
    assert.equal(payload.length, 63);
    assert.deepEqual(payload, buildReadRequest(0, 1).slice(1));
    emit(device, 1, new Uint8Array(15)); // Unrelated keyboard report.
    emit(device, 4, payload);
  };
  const result = await connection.read(0, 1);
  assert.equal(toHex(result.data), '00');
});

test('timeout closes the connection so a late response cannot satisfy a new read', async () => {
  const device = fakeDevice();
  const connection = new EdgeConnection(device);
  await assert.rejects(connection.read(0, 1, 15), /did not reply/);
  assert.equal(device.opened, false);
  await assert.rejects(connection.read(0, 1), /Connect the keyboard/);
});

test('disconnect rejects an in-flight read', async () => {
  const connection = new EdgeConnection(fakeDevice());
  const pending = connection.read(0, 1);
  const assertion = assert.rejects(pending, /disconnected/);
  await connection.close();
  await assertion;
});

test('chooser cancellation does not open a device', async () => {
  await assert.rejects(EdgeConnection.request({ requestDevice: async () => [] }), /Select one/);
});

test('previously authorized Edge reconnects without another chooser', async () => {
  const device = fakeDevice();
  device.opened = false;
  const connection = await EdgeConnection.request({
    getDevices: async () => [device],
    requestDevice: async () => assert.fail('Existing authorization should be reused'),
  });
  assert.equal(connection.device, device);
  assert.equal(device.opened, true);
});

test('all84 visible keys map uniquely to physically captured default triples', async () => {
  const { KEY_LAYOUT } = await import('../dist/layout.js');
  const { factoryMap, verifyFactoryMap, remapKey, validateDraft, countChanges, hasPendingChanges } = await import('../dist/keymap.js');
  const capture = JSON.parse(await readFile(new URL('./fixtures/edge-key-layout.json', import.meta.url)));
  assert.equal(toHex(factoryMap()), capture.matrix_hex);
  assert.equal(KEY_LAYOUT.length, 84);
  assert.equal(new Set(KEY_LAYOUT.map(key => key.slot)).size, 84);
  for (const key of KEY_LAYOUT) assert.deepEqual(Array.from(factoryMap().slice(key.slot*3, key.slot*3+3)), key.triple);
  const f12 = KEY_LAYOUT.find(key => key.label === 'F12');
  const caps = KEY_LAYOUT.find(key => key.label === 'CapsLock');
  const fn = KEY_LAYOUT.find(key => key.label === 'Fn');
  const changed = remapKey(factoryMap(), f12.id, [0x20, 0, 0x68]);
  assert.equal(countChanges(changed), 1);
  assert.equal(changed[38], 0x68);
  assert.throws(() => verifyFactoryMap(changed), /differs/);
  assert.throws(() => remapKey(changed, fn.id, [0x20, 0, 4]), /cannot/);
  assert.throws(() => remapKey(changed, f12.id, [0x70, 0, 4]), /verified key/);
  const capsFn = remapKey(factoryMap(), caps.id, fn.triple);
  assert.deepEqual(Array.from(capsFn.slice(caps.slot * 3, caps.slot * 3 + 3)), [0xa0, 1, 0]);
  assert.equal(countChanges(capsFn), 1);
  assert.equal(hasPendingChanges(factoryMap(), toHex(capsFn)), true);
  const bad = factoryMap();
  bad[127*3] = 0x20;
  assert.throws(() => validateDraft(bad), /protected/);
});

function simulatedKeyboard({ failWrite = 0, slots = 128, currentMap = null } = {}) {
  const device = fakeDevice();
  const sent = [];
  let written = 0;
  device.sendReport = async (reportId, payload) => {
    assert.equal(reportId, 4);
    const packet = new Uint8Array(64);
    packet[0] = 4;
    packet.set(payload, 1);
    sent.push(packet.slice());
    const offset = packet[5] + packet[6]*256;
    if (packet[3] === 3) packet[13] = slots;
    if (packet[3] === 7) {
      const { factoryMap } = await import('../dist/keymap.js');
      packet.set(factoryMap().slice(offset, offset + packet[4]), 8);
    }
    if (packet[3] === 8) {
      const { factoryMap } = await import('../dist/keymap.js');
      packet.set((currentMap ?? factoryMap()).slice(offset, offset + packet[4]), 8);
    }
    if (packet[3] === 9 && ++written === failWrite) packet[7] = 255;
    emit(device, reportId, packet.slice(1));
  };
  return { device, sent };
}

test('opcode08 loads the current device map while opcode07 remains the factory baseline', async () => {
  const { factoryMap, remapKey } = await import('../dist/keymap.js');
  const { KEY_LAYOUT } = await import('../dist/layout.js');
  const caps = KEY_LAYOUT.find(key => key.label === 'CapsLock');
  const fn = KEY_LAYOUT.find(key => key.label === 'Fn');
  const current = remapKey(factoryMap(), caps.id, fn.triple);
  const { device, sent } = simulatedKeyboard({ currentMap: current });
  assert.deepEqual(await new EdgeConnection(device).loadKeymap(), current);
  assert.equal(sent.filter(packet => packet[3] === 7).length, 7);
  assert.equal(sent.filter(packet => packet[3] === 8).length, 7);
});

test('restore defaults is isolated behind an explicit destructive confirmation', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
  assert.match(html, /class="danger-zone"/);
  assert.match(html, /<dialog id="restore-dialog"/);
  assert.match(html, /class="restore-impact"/);
  assert.match(html, /id="confirm-restore"[^>]*class="danger"/);
  assert.match(app, /restore-dialog'\)\.showModal\(\)/);
  assert.match(app, /confirm-restore[\s\S]*applyDraft\(true\)/);
});

test('complete browser transaction matches the successful physical remap capture', async () => {
  const { factoryMap, remapKey } = await import('../dist/keymap.js');
  const capture = JSON.parse(await readFile(new URL('./fixtures/remap-f12-boot-test.json', import.meta.url)));
  const { device, sent } = simulatedKeyboard();
  const connection = new EdgeConnection(device);
  await connection.loadKeymap();
  assert.deepEqual(await connection.applyKeymap(remapKey(factoryMap(), 12, [0x20, 0, 0x68])), remapKey(factoryMap(), 12, [0x20, 0, 0x68]));
  assert.deepEqual(sent.filter(packet => [1, 9, 2].includes(packet[3])).map(toHex), capture.exchanges.filter(exchange => ['test-begin', 'test-write', 'test-finish'].includes(exchange.phase)).map(exchange => exchange.request_hex));
  const beforeRestore = sent.length;
  await connection.applyKeymap(factoryMap());
  assert.deepEqual(sent.slice(beforeRestore).filter(packet => [1, 9, 2].includes(packet[3])).map(toHex), capture.exchanges.filter(exchange => ['restore-begin', 'restore-write', 'restore-finish'].includes(exchange.phase)).map(exchange => exchange.request_hex));
});

test('unsupported slot count prevents writes and unverified sessions cannot apply', async () => {
  const { factoryMap } = await import('../dist/keymap.js');
  const { device, sent } = simulatedKeyboard({ slots: 127 });
  const connection = new EdgeConnection(device);
  await assert.rejects(connection.loadKeymap(), /128-slot/);
  await assert.rejects(connection.applyKeymap(factoryMap()), /Load and verify/);
  assert.equal(sent.some(packet => [1, 9, 2].includes(packet[3])), false);
});

test('failed write stops the transaction, closes stale connection, and explains recovery', async () => {
  const { factoryMap } = await import('../dist/keymap.js');
  const { device, sent } = simulatedKeyboard({ failWrite: 2 });
  const connection = new EdgeConnection(device);
  await connection.loadKeymap();
  await assert.rejects(connection.applyKeymap(factoryMap()), /interrupted:.*status.*Restore defaults/);
  assert.equal(device.opened, false);
  assert.equal(sent.filter(packet => packet[3] === 9).length, 2);
  assert.equal(sent.some(packet => packet[3] === 2), false);
});

test('keymap operation excludes settings reads between its reports', async () => {
  const { factoryMap } = await import('../dist/keymap.js');
  const { device } = simulatedKeyboard();
  const connection = new EdgeConnection(device);
  await connection.loadKeymap();
  const applying = connection.applyKeymap(factoryMap());
  await assert.rejects(connection.read(0, 1), /operation is already/);
  await applying;
});

