import type { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
type Layer = { id: number; name?: string };
export type Action = {
  label: string;
  group?: string;
  binding: BehaviorBinding;
};
export const IDS: Record<string, number>;
export const PRINTED_KEYS: Array<{
  slot: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  triple: number[];
}>;
export function keyLabel(s: string): string;
export function bindingLabel(
  b: BehaviorBinding | undefined,
  layers?: Layer[],
): string;
export function supportsBinding(
  b: BehaviorBinding,
  behaviors: Record<number, GetBehaviorDetailsResponse>,
  layers: Layer[],
): boolean;
export function basicAction(
  k: (typeof PRINTED_KEYS)[number],
  layers: Layer[],
): Action;
export const EDGE_BLUETOOTH_PROFILES: number;
export function edgeBehaviorMetadata<T extends GetBehaviorDetailsResponse>(details: T): T;
export function functionActions(): Action[];
export function layerActions(l: Layer[]): Action[];
export function shortcutActions(mac?: boolean): Action[];
export function specialActions(): Action[];
export function customShortcut(usage: number, mods: number): BehaviorBinding;
