// Transfer metadata only, never key mappings. Never resume an interrupted write.
const KEY = 'lofree-edge-firmware-attempt-v1';

export function protectFirmwareTransfer(target) {
  const warn = event => { event.preventDefault(); event.returnValue = ''; };
  target.addEventListener('beforeunload', warn);
  return () => target.removeEventListener('beforeunload', warn);
}

export function readFirmwareAttempt(storage) {
  try {
    const value = JSON.parse(storage.getItem(KEY));
    return value?.format === KEY ? value : null;
  } catch { return null; }
}

export function saveFirmwareAttempt(storage, attempt) {
  try { storage.setItem(KEY, JSON.stringify({ ...attempt, format: KEY, updatedAt: new Date().toISOString() })); }
  catch { /* Storage failure must never interrupt a firmware transfer. */ }
}
