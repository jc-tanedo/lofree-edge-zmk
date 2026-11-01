import { EdgeConnection } from './webhid.js';
import { mountFirmwarePanel } from './firmware-ui.js';
import { toHex } from './protocol.js';
import { decodeProfile } from './profile.js';
import { KEY_LAYOUT } from './layout.js';
import { factoryMap, targetOptions, remapKey, countChanges, hasPendingChanges } from './keymap.js';

const byId = id => document.getElementById(id);
let connection = null;
let snapshot = null;
let busy = false;
const supported = window.isSecureContext && 'hid' in navigator;
let draft = null;
let selectedKey = null;
let layoutConnection = null;
let appliedHex = null;
const options = targetOptions();
const shortLabels = { BackSpace: 'Backspace', CapsLock: 'Caps', PrintScreen: 'PrtSc', PageUp: 'PgUp', PageDown: 'PgDn', 'Left Shift': 'Shift', 'Right Shift': 'Shift', 'Left Ctrl': 'Ctrl', 'Right Ctrl': 'Ctrl', 'Left Alt': 'Alt', 'Right Alt': 'Alt', 'Left Win': 'Win' };

for (const key of KEY_LAYOUT) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.keyId = key.id;
  button.setAttribute('aria-label', key.label === 'Fn' ? 'Fn — protected' : `Remap ${key.label}`);
  button.title = key.label === 'Fn' ? 'Fn is protected' : key.label;
  button.style.left = `${key.x / 419 * 100}%`;
  button.style.top = `${key.y / 156 * 100}%`;
  button.style.width = `${key.width / 419 * 100}%`;
  button.style.height = `${key.height / 156 * 100}%`;
  button.append(document.createTextNode(shortLabels[key.label] ?? key.label));
  const target = document.createElement('span');
  target.className = 'key-target';
  button.append(target);
  button.addEventListener('click', () => { selectedKey = key; renderKeymap(); });
  byId('keyboard').append(button);
}
for (const option of options) {
  const element = document.createElement('option');
  element.value = option.triple.join(',');
  element.textContent = option.label;
  byId('assignment').append(element);
}

function remapMessage(text, error = false) {
  byId('remap-result').textContent = text;
  byId('remap-result').classList.toggle('error', error);
}

function renderKeymap() {
  document.dispatchEvent(new CustomEvent('edge-unsaved-changes', {
    detail: Boolean(draft && hasPendingChanges(draft, appliedHex)),
  }));
  const ready = Boolean(draft && connection === layoutConnection && connection?.device.opened);
  byId('load-keymap').disabled = busy || !connection?.device.opened || ready;
  byId('load-keymap').textContent = ready ? 'Layout verified' : 'Load key layout';
  byId('keyboard-scroll').hidden = !draft;
  byId('key-controls').hidden = !draft;
  byId('apply-keymap').disabled = busy || !ready || !hasPendingChanges(draft, appliedHex);
  byId('restore-keymap').disabled = busy || !ready;
  byId('export-keymap').disabled = busy || !draft;
  byId('assignment').disabled = busy || !ready || !selectedKey;
  byId('reset-key').disabled = busy || !ready || !selectedKey;
  byId('keymap-state').textContent = ready ? '84 keys · Current device map' : 'Layout not loaded';
  if (!draft) return;
  const changes = countChanges(draft);
  const applied = toHex(draft) === appliedHex;
  byId('draft-summary').textContent = `${changes} remapped ${changes === 1 ? 'key' : 'keys'} · ${applied ? 'Applied this session' : 'Draft not applied'}`;
  for (const key of KEY_LAYOUT) {
    const button = byId('keyboard').querySelector(`[data-key-id="${key.id}"]`);
    const triple = draft.slice(key.slot * 3, key.slot * 3 + 3);
    const changed = toHex(triple) !== toHex(Uint8Array.from(key.triple));
    button.disabled = busy || !ready || key.triple[0] !== 0x20;
    button.classList.toggle('selected', selectedKey === key);
    button.classList.toggle('changed', changed);
    button.setAttribute('aria-pressed', String(selectedKey === key));
    button.querySelector('.key-target').textContent = changed ? options.find(option => option.triple.join(',') === Array.from(triple).join(','))?.label ?? '?' : '';
    if (selectedKey === key) {
      byId('selected-key').textContent = key.label;
      byId('assignment').value = Array.from(triple).join(',');
    }
  }
}

function message(text, error = false) {
  byId('message').textContent = text;
  byId('message').classList.toggle('error', error);
}

function showSnapshot(current, exchange) {
  snapshot = {
    format: 'lofree-edge-partial-snapshot-v1', capturedAt: new Date().toISOString(),
    device: { name: current.device.productName, vendorId: current.device.vendorId, productId: current.device.productId },
    offset: 0, length: 56, dataHex: toHex(exchange.data),
    decodedProfile: decodeProfile(exchange.data),
    requestHex: toHex(exchange.request), responseHex: toHex(exchange.response),
  };
  byId('snapshot-device').textContent = snapshot.device.name;
  byId('brightness').textContent = snapshot.decodedProfile.brightness === null ? 'Unrecognized' : `${snapshot.decodedProfile.brightness} / 4`;
  byId('effect-speed').textContent = snapshot.decodedProfile.effectSpeed === null ? 'Unrecognized' : `${snapshot.decodedProfile.effectSpeed}`;
  byId('read-time').textContent = new Date(snapshot.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  byId('hex-output').textContent = Array.from({ length: 7 }, (_, row) => {
    const start = row * 8;
    return `${start.toString(16).padStart(4, '0')}   ${Array.from(exchange.data.slice(start, start + 8), byte => byte.toString(16).padStart(2, '0')).join(' ')}`;
  }).join('\n');
}

async function readSettings(current) {
  const selector = (await current.read(0, 1)).data[0];
  if (selector !== 0) throw new Error('This keyboard’s active profile is not supported by this early version.');
  const exchange = await current.read(0, 56);
  if (connection === current) showSnapshot(current, exchange);
}

async function loadLayout(current) {
  const currentMap = await current.loadKeymap();
  if (connection !== current) return;
  draft = currentMap;
  layoutConnection = current;
  appliedHex = toHex(currentMap);
  selectedKey = null;
  byId('assignment').value = '';
  byId('selected-key').textContent = 'a key';
  remapMessage('Current key assignments read from the keyboard. Choose a key to edit.');
}

async function initializeConnection(current) {
  await readSettings(current);
  await loadLayout(current);
}

function render() {
  const connected = Boolean(connection?.device.opened);
  byId('connect').disabled = busy || !supported || connected;
  byId('connect').hidden = connected;
  byId('disconnect').hidden = !connected;
  byId('disconnect').disabled = busy;
  byId('read').disabled = busy || !connected;
  byId('read').textContent = 'Read settings';
  byId('export').disabled = busy || !snapshot;
  byId('connection-status').textContent = connected ? 'Connected' : 'Disconnected';
  byId('connection-status').classList.toggle('connected', connected);
  byId('read-state').textContent = busy && connected ? 'Keyboard busy' : snapshot ? 'Snapshot available' : connected ? 'Ready to read' : 'Waiting for connection';
  byId('device-description').textContent = connected ? `${connection.device.productName} is connected and ready.` : 'Plug in a USB data cable and switch your keyboard to wired mode.';
  byId('empty-state').hidden = Boolean(snapshot);
  byId('snapshot').hidden = !snapshot;
  renderKeymap();
}

byId('connect').addEventListener('click', async () => {
  busy = true;
  message('Select your Edge in the browser’s device picker if prompted.');
  render();
  try {
    // The chooser must run directly from this user gesture.
    connection = await EdgeConnection.request(navigator.hid);
    snapshot = null;
    draft = null;
    selectedKey = null;
    layoutConnection = null;
    appliedHex = null;
    byId('assignment').value = '';
    byId('selected-key').textContent = 'a key';
    message('Keyboard connected. Reading settings and loading the key layout…');
    await initializeConnection(connection);
    message('Keyboard ready. Settings and key layout loaded automatically.');
  } catch (error) { message(error.message, true); }
  finally { busy = false; render(); }
});

byId('disconnect').addEventListener('click', async () => {
  busy = true;
  render();
  const previous = connection;
  connection = null;
  try { await previous?.close(); message('Disconnected. Your existing snapshot is still available.'); }
  catch (error) { message(error.message, true); }
  finally { busy = false; render(); }
});

byId('read').addEventListener('click', async () => {
  busy = true;
  render();
  const current = connection;
  try {
    await readSettings(current);
    message('Settings read successfully. No configuration changes were made.');
  } catch (error) { message(error.message, true); }
  finally { busy = false; render(); }
});

byId('export').addEventListener('click', () => {
  if (!snapshot) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `lofree-edge-${snapshot.capturedAt.replace(/[:.]/g, '-')}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

navigator.hid?.addEventListener('disconnect', event => {
  if (connection?.device !== event.device) return;
  const previous = connection;
  connection = null;
  void previous.close().catch(() => {});
  message('Keyboard unplugged. Reconnect it to read again.');
  render();
});

if (!supported) {
  message(window.isSecureContext ? 'This browser does not support WebHID. Open the page in desktop Chrome or Edge.' : 'Open this page over HTTPS or at localhost to connect your keyboard.', true);
}
render();

mountFirmwarePanel({
  begin() { if (busy) return false; busy = true; render(); return true; },
  end() { busy = false; render(); },
  async disconnectExisting() {
    const previous = connection;
    connection = null;
    await previous?.close();
    render();
  },
});

byId('load-keymap').addEventListener('click', async () => {
  busy = true;
  render();
  const current = connection;
  remapMessage('Reading and verifying the keyboard’s factory slot layout…');
  try {
    await loadLayout(current);
  } catch (error) { remapMessage(error.message, true); }
  finally { busy = false; render(); }
});

byId('assignment').addEventListener('change', () => {
  if (!selectedKey || !draft || !byId('assignment').value) return;
  try {
    draft = remapKey(draft, selectedKey.id, byId('assignment').value.split(',').map(Number));
    remapMessage('Draft updated. Apply keymap to send it to your keyboard.');
    renderKeymap();
  } catch (error) { remapMessage(error.message, true); }
});

byId('reset-key').addEventListener('click', () => {
  if (!selectedKey || !draft) return;
  draft = remapKey(draft, selectedKey.id, selectedKey.triple);
  remapMessage('Selected key reset in the draft. Apply keymap to send this change.');
  renderKeymap();
});

async function applyDraft(restore) {
  if (!draft || busy) return;
  const map = restore ? factoryMap() : draft.slice();
  busy = true;
  render();
  remapMessage(restore ? 'Restoring keycap defaults. Keep the USB cable connected…' : 'Applying keymap. Keep the USB cable connected…');
  try {
    await connection.applyKeymap(map, (sent, total) => remapMessage(`Sending keymap: ${sent} / ${total} bytes. Keep the USB cable connected…`));
    draft = map;
    appliedHex = toHex(map);
    remapMessage(restore ? 'Factory keymap restored. The keyboard acknowledged the complete update.' : 'Keymap applied. The keyboard acknowledged the complete update. Try your remapped keys.');
  } catch (error) { appliedHex = null; remapMessage(error.message, true); }
  finally { busy = false; render(); }
}
byId('apply-keymap').addEventListener('click', () => void applyDraft(false));
byId('restore-keymap').addEventListener('click', () => byId('restore-dialog').showModal());
byId('confirm-restore').addEventListener('click', event => {
  event.preventDefault();
  byId('restore-dialog').close();
  void applyDraft(true);
});
byId('export-keymap').addEventListener('click', () => {
  if (!draft) return;
  const saved = { format: 'lofree-edge-keymap-draft-v1', savedAt: new Date().toISOString(), profile: 0, source: 'command08-current-map', keymapHex: toHex(draft), remappedKeys: countChanges(draft), firmwareReadback: true };
  const url = URL.createObjectURL(new Blob([JSON.stringify(saved, null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'lofree-edge-keymap-draft.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

