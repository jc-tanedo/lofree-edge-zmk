import type { Keymap } from '@zmkfirmware/zmk-studio-ts-client/keymap';
import type { GetBehaviorDetailsResponse } from '@zmkfirmware/zmk-studio-ts-client/behaviors';
import type { Request, RequestResponse } from '@zmkfirmware/zmk-studio-ts-client';
export type Rpc = (request: Omit<Request,'requestId'>) => Promise<RequestResponse>;
export interface Parsed { layers: Array<{name:string;sourceIndex:number;enabled:boolean;bindings:Array<{action:string;param1:number;param2:number}>}>; }
export interface Plan { beforeKey:string;targets:Keymap['layers'];changes:Array<{layer:number;position:number;binding:Keymap['layers'][number]['bindings'][number]}>;add:number;remove:number;renamed:number; }
export function parseKeymap(source:string):Parsed;
export function snapshotKey(map:Keymap):string;
export function planImport(parsed:Parsed,current:Keymap,details:Map<number,GetBehaviorDetailsResponse>):Plan;
export function readImportContext(rpc:Rpc):Promise<{map:Keymap;details:Map<number,GetBehaviorDetailsResponse>}>;
export function applyImport(rpc:Rpc,plan:Plan,progress?:(done:number,total:number)=>void):Promise<Keymap>;
