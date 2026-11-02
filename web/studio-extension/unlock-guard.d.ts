import type { Keymap } from '@zmkfirmware/zmk-studio-ts-client/keymap';
import type { Rpc } from './keymap-import.js';
export const UNLOCK_SAVE_ERROR:string;
export function hasUnlockBinding(map:Pick<Keymap,'layers'>|null|undefined):boolean;
export function unlockSaveBlocked(map:Pick<Keymap,'layers'>|null|undefined,requireUnlock:boolean|undefined):boolean;
export function assertUnlockSaveAllowed(rpc:Rpc,readPolicy:()=>Promise<boolean>,target?:Pick<Keymap,'layers'>):Promise<void>;
