// Classic script: unlike the application modules, this can explain file:// mode.
(() => {
  const fileMode = window.location.protocol === 'file:';
  document.getElementById('local-file-notice').hidden = !fileMode;
  if (!fileMode) return;
  document.getElementById('firmware-status').textContent = 'Open the local configurator at http://127.0.0.1:8765/ to load firmware choices.';
  document.getElementById('message').textContent = 'This app needs localhost or HTTPS. Use Open local configurator above.';
  for (const id of ['connect', 'firmware-image', 'firmware-connect', 'firmware-install']) {
    document.getElementById(id).disabled = true;
  }
})();
