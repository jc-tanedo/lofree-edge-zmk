// Classic-script fallback still works when file:// blocks React modules.
(() => {
  const notice = document.getElementById('local-file-notice');
  if (notice) notice.hidden = window.location.protocol !== 'file:';
})();
