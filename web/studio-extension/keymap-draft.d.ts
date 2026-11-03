import type { Keymap } from '@zmkfirmware/zmk-studio-ts-client/keymap';
import type { Rpc } from './keymap-import.js';
export type DraftState={base?:Keymap;map?:Keymap;count:number;canUndo:boolean;canRedo:boolean;saving:boolean;error:string;uncertain:boolean};
export function draftChangeCount(base:Keymap|undefined,map:Keymap|undefined):number;
export class KeymapDraft {
 state:DraftState;subscribe:(fn:()=>void)=>()=>void;getSnapshot:()=>DraftState;
 load(map:Keymap,force?:boolean):void; edit(fn:(map:Keymap)=>void):void; replace(map:Keymap):void;
 undo():void;redo():void;discard():void;clear():void;
 save(rpc:Rpc,policy:()=>Promise<boolean>):Promise<Keymap>;
}
