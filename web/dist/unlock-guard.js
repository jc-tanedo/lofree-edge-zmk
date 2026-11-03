// SPDX-License-Identifier: GPL-3.0-or-later
import { IDS } from './studio-actions.js';
export const UNLOCK_SAVE_ERROR = 'Saving is blocked: add an accessible Unlock Studio binding or disable the physical-unlock requirement in Security.';
export function hasUnlockBinding(map) {
  return !!map?.layers?.some(layer => layer.bindings?.some(binding => binding.behaviorId === IDS.studio_unlock));
}
export function unlockSaveBlocked(map, requireUnlock) {
  return !!map && !hasUnlockBinding(map) && requireUnlock !== false;
}
// Always read the live device before persistence; UI state is only feedback.
export async function assertUnlockSaveAllowed(rpc, readPolicy, target) {
  const map = target ?? (await rpc({keymap:{getKeymap:true}})).keymap?.getKeymap;
  if (!map) throw new Error('Could not verify the current keymap. Reconnect before saving.');
  if (hasUnlockBinding(map)) return;
  let required;
  try { required = await readPolicy(); }
  catch { throw new Error('Could not verify the unlock requirement. Add an Unlock Studio binding before saving.'); }
  if (required !== false) throw new Error(UNLOCK_SAVE_ERROR);
}
