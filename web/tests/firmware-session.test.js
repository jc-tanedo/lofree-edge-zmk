import assert from 'node:assert/strict';
import test from 'node:test';
import { protectFirmwareTransfer, readFirmwareAttempt, saveFirmwareAttempt } from '../dist/firmware-session.js';

test('an active transfer asks before unloading, and cleanup removes the warning', () => {
  const target = new EventTarget();
  const cleanup = protectFirmwareTransfer(target);
  const active = new Event('beforeunload', { cancelable: true });
  target.dispatchEvent(active);
  assert.equal(active.defaultPrevented, true);
  cleanup();
  const finished = new Event('beforeunload', { cancelable: true });
  target.dispatchEvent(finished);
  assert.equal(finished.defaultPrevented, false);
});

test('last acknowledged progress survives a new UI session without firmware bytes or keymaps', () => {
  const entries = new Map();
  const storage = { getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value) };
  saveFirmwareAttempt(storage, { state: 'transferring', file: 'edge-studio.ota.bin', completed: 64, total: 5429 });
  const restored = readFirmwareAttempt(storage);
  assert.equal(restored.state, 'transferring');
  assert.equal(restored.completed, 64);
  assert.equal(restored.total, 5429);
  assert.equal(restored.file, 'edge-studio.ota.bin');
  assert(restored.updatedAt);
});

test('disabled or corrupt browser storage never interrupts firmware handling', () => {
  assert.doesNotThrow(() => saveFirmwareAttempt(undefined, { state: 'failed' }));
  assert.equal(readFirmwareAttempt(undefined), null);
  assert.equal(readFirmwareAttempt({ getItem: () => '{broken' }), null);
  assert.equal(readFirmwareAttempt({ getItem: () => '{"format":"unrelated"}' }), null);
});
