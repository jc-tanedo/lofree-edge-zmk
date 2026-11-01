import type { Keymap } from '@zmkfirmware/zmk-studio-ts-client/keymap';
export function exportFiles(map: Keymap): Record<string,string>;
export function exportZip(files: Record<string,string>): Uint8Array;
export function exportLayout():{layouts:{LAYOUT:{layout:Array<{label:string}>}}};
export function describeBinding(binding:Keymap['layers'][number]['bindings'][number]|undefined):string;
