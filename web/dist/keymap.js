import { KEY_LAYOUT, FACTORY_MATRIX_HEX } from './layout.js';
import { toHex } from './protocol.js';

export function factoryMap() {
  return Uint8Array.from(FACTORY_MATRIX_HEX.match(/../g), value => parseInt(value, 16));
}

export function verifyFactoryMap(map) {
  if (!(map instanceof Uint8Array) || toHex(map) !== FACTORY_MATRIX_HEX) throw new Error('This keyboard’s slot layout differs from the verified Edge layout.');
}

export function targetOptions() {
  const options = KEY_LAYOUT.filter(key => key.triple[0] === 0x20).map(key => ({ label: key.label, triple: key.triple }));
  for (let index = 13; index <= 24; index++) options.push({ label: `F${index}`, triple: [0x20, 0, 0x68 + index - 13] });
  const fn = KEY_LAYOUT.find(key => key.label === 'Fn');
  if (!fn || fn.triple.join(',') !== '160,1,0') throw new Error('The verified Fn assignment is unavailable.');
  options.push({ label: 'Fn', triple: fn.triple });
  return options;
}

export function validateDraft(map) {
  if (!(map instanceof Uint8Array) || map.length !== 384) throw new Error('Expected a384-byte keymap.');
  const defaults = factoryMap();
  const editable = new Set(KEY_LAYOUT.filter(key => key.triple[0] === 0x20).map(key => key.slot));
  const targets = new Set(targetOptions().map(option => option.triple.join(',')));
  for (let slot = 0; slot < 128; slot++) {
    const triple = map.slice(slot * 3, slot * 3 + 3);
    if (toHex(triple) === toHex(defaults.slice(slot * 3, slot * 3 + 3))) continue;
    if (!editable.has(slot) || !targets.has(Array.from(triple).join(','))) throw new Error('Only verified key and Fn assignments are supported. The original Fn key and internal slots are protected.');
  }
}

export function remapKey(map, keyId, targetTriple) {
  validateDraft(map);
  if (!Array.isArray(targetTriple) || targetTriple.length !== 3 || targetTriple.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255)) throw new Error('Expected exactly three assignment bytes.');
  const key = KEY_LAYOUT.find(key => key.id === keyId);
  if (!key || key.triple[0] !== 0x20) throw new Error('This key cannot be remapped.');
  const updated = map.slice();
  updated.set(targetTriple, key.slot * 3);
  validateDraft(updated);
  return updated;
}

export function countChanges(map) {
  if (!(map instanceof Uint8Array) || map.length !== 384) throw new Error('Expected a384-byte keymap.');
  return KEY_LAYOUT.filter(key => toHex(map.slice(key.slot * 3, key.slot * 3 + 3)) !== toHex(Uint8Array.from(key.triple))).length;
}

export function hasPendingChanges(map, appliedHex) {
  if (!(map instanceof Uint8Array) || map.length !== 384) throw new Error('Expected a384-byte keymap.');
  return typeof appliedHex !== 'string' || toHex(map) !== appliedHex;
}
