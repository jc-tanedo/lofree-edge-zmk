import { EdgeConnection } from './webhid.js';
import { flashFirmware, validateFirmware } from './firmware.js';
import { protectFirmwareTransfer, readFirmwareAttempt, saveFirmwareAttempt } from './firmware-session.js';

export function mountFirmwarePanel({ begin, end, disconnectExisting, onConnectionChange = () => {} }) {
  const byId = id => document.getElementById(id);
  let connection = null;
  let verified = false;
  let approved = null;
  let image = null;
  let running = false;
  let storage;
  try { storage = window.localStorage; } catch { /* Browser storage may be disabled. */ }
  const previousAttempt = readFirmwareAttempt(storage);
  if (previousAttempt && ['preflight', 'transferring', 'failed'].includes(previousAttempt.state)) {
    byId('firmware-last-attempt').hidden = false;
    byId('firmware-last-attempt').textContent = `Previous update ${previousAttempt.state === 'failed' ? 'stopped' : 'was interrupted'}: ${previousAttempt.completed ?? 0} / ${previousAttempt.total} blocks acknowledged. Reconnect and verify the running firmware before starting another update.`;
  }
  const status = (text, error = false) => {
    byId('firmware-status').textContent = text;
    byId('firmware-status').classList.toggle('error', error);
  };
  const render = () => {
    document.querySelectorAll("[data-workspace-tab]").forEach(tab => { tab.disabled = running; });
    document.querySelector('edge-navigation').inert = running;
    byId('firmware-install').disabled = running || !image || !connection?.device.opened;
    const connected = verified && connection?.device.opened;
    onConnectionChange(Boolean(connected));
    byId('firmware-connect').textContent = connected ? '✓ Connected' : 'Connect stock update interface';
    byId('firmware-connect').classList.toggle('connected', Boolean(connected));
    byId('firmware-connect').disabled = running || connected || !navigator.hid || !window.isSecureContext;
    byId('firmware-image').disabled = running;
  };
  const loadImage = async () => {
    image = null;
    approved = null;
    render();
    const selected = byId('firmware-image').selectedOptions[0];
    if (!selected?.dataset.build) return;
    try {
      const build = JSON.parse(selected.dataset.build);
      const response = await fetch(`firmware/${build.file}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Firmware download failed.');
      // Ignore a fetch that completed after the user chose a different build.
      const candidate = await validateFirmware(new Uint8Array(await response.arrayBuffer()), build);
      if (selected !== byId('firmware-image').selectedOptions[0]) return;
      image = candidate;
      approved = build;
      byId('firmware-details').textContent = `${build.size.toLocaleString()} bytes · SHA-256 ${build.sha256}`;
      byId('firmware-download').href = `firmware/${build.file}`;
      byId('firmware-download').hidden = false;
      status(verified && connection?.device.opened ? 'Image verified. Stock Edge connected; ready to install.' : 'Image verified. Connect the stock update interface.');
    } catch (error) { status(error.message, true); }
    render();
  };
  byId('firmware-image').addEventListener('change', loadImage);
  void (async () => {
    try {
      const response = await fetch('firmware/manifest.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Firmware builds are not available yet.');
      const manifest = await response.json();
      if (manifest.format !== 'lofree-edge-browser-firmware-v1' || !Array.isArray(manifest.builds)) throw new Error('Unrecognized firmware catalog.');
      for (const build of manifest.builds) {
        if (!/^[a-z0-9-]+\.ota\.bin$/.test(build.file)) throw new Error('Invalid firmware filename.');
        const option = document.createElement('option');
        option.textContent = build.label;
        option.dataset.build = JSON.stringify(build);
        byId('firmware-image').append(option);
      }
      byId('firmware-image').selectedIndex = manifest.builds.length ? 1 : 0;
      await loadImage();
    } catch (error) { status(error.message, true); }
  })();
  byId('firmware-connect').addEventListener('click', async () => {
    if (!begin()) return;
    running = true;
    verified = false;
    render();
    try {
      await connection?.close();
      await disconnectExisting();
      connection = await EdgeConnection.request(navigator.hid);
      await connection.verifyForFirmwareUpdate();
      verified = true;
      status('Stock Edge verified. Ready to install the selected firmware.');
    } catch (error) {
      await connection?.close().catch(() => {});
      connection = null;
      verified = false;
      status(error.message, true);
    } finally { running = false; end(); render(); }
  });
  window.addEventListener('beforeunload', event => { if (running) { event.preventDefault(); event.returnValue = ''; } });
  byId('firmware-risk-ack').addEventListener('change', () => { byId('firmware-confirm-install').disabled = !byId('firmware-risk-ack').checked; });
  byId('firmware-install').addEventListener('click', () => {
    if (!image || !approved || running) return;
    byId('firmware-confirm-details').textContent = `${approved.label} (${approved.size.toLocaleString()} bytes)`;
    byId('firmware-risk-ack').checked = false;
    byId('firmware-confirm-install').disabled = true;
    byId('firmware-dialog').returnValue = 'cancel';
    byId('firmware-dialog').showModal();
  });
  byId('firmware-dialog').addEventListener('close', async () => {
    const acknowledged = byId('firmware-risk-ack').checked;
    byId('firmware-risk-ack').checked = false;
    byId('firmware-confirm-install').disabled = true;
    if (byId('firmware-dialog').returnValue !== 'install' || !acknowledged || !image || !approved || !connection?.device.opened || !begin()) return;
    running = true;
    render();
    const current = connection;
    const unprotect = protectFirmwareTransfer(window);
    const attempt = { state: 'preflight', file: approved.file, sha256: approved.sha256,
      completed: 0, total: Math.floor(image.length / 16) + 1 };
    saveFirmwareAttempt(storage, attempt);
    byId('firmware-last-attempt').hidden = true;
    byId('firmware-progress').value = 0;
    byId('firmware-progress').hidden = false;
    try {
      await disconnectExisting();
      if (!current.device.opened) await current.device.open();
      status('Installing firmware. Keep the USB cable connected…');
      await flashFirmware(current, image, approved, (done, total) => {
        attempt.state = 'transferring';
        attempt.completed = done;
        if (done % 32 === 0 || done === total) saveFirmwareAttempt(storage, attempt);
        byId('firmware-progress').value = done / total;
        if (done % 32 === 0 || done === total) status(`Installing firmware · ${Math.round(done / total * 100)}%`);
      });
      attempt.state = 'restart-requested';
      saveFirmwareAttempt(storage, attempt);
      status('Transfer complete; restart requested. For Studio builds, connect over USB and press Fn+U to unlock.');
    } catch (error) {
      attempt.state = 'failed';
      attempt.error = error.message;
      saveFirmwareAttempt(storage, attempt);
      status(`${error.message} Reconnect and verify the running firmware before retrying.`, true);
    }
    finally {
      unprotect();
      await current.close().catch(() => {});
      connection = null;
      verified = false;
      running = false;
      end();
      render();
    }
  });
  navigator.hid?.addEventListener('disconnect', event => {
    if (connection?.device !== event.device) return;
    connection = null;
    verified = false;
    if (!running) status('Update interface disconnected. Reconnect stock firmware to install.');
    render();
  });
  render();
}
