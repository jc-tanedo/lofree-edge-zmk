// UI presets only. The device's advertised behavior metadata is authoritative.
import { KEY_LAYOUT } from "./layout.js";
import { KEY_SYMBOLS } from "./keymap-export-symbols.js";
import { behaviorId } from "./keymap-export.js";
export const IDS = Object.fromEntries(
  [
    "key_press",
    "momentary_layer",
    "toggle_layer",
    "to_layer",
    "transparent",
    "none",
    "bcklight",
    "studio_unlock",
    "prev_firmware",
    "bluetooth",
    "outputs",
  ].map((n) => [n, behaviorId(n)]),
);
export const PRINTED_KEYS = [...KEY_LAYOUT].sort((a, b) => a.slot - b.slot);
const short = {
  "+": "=",
  BackSpace: "⌫",
  CapsLock: "Caps",
  PrintScreen: "PrtSc",
  PageUp: "PgUp",
  PageDown: "PgDn",
  "Left Shift": "Shift",
  "Right Shift": "Shift",
  "Left Ctrl": "Ctrl",
  "Right Ctrl": "Ctrl",
  "Left Alt": "Alt",
  "Right Alt": "Alt",
  "Left Win": "Win",
  Left: "←",
  Right: "→",
  Up: "↑",
  Down: "↓",
  Enter: "Enter",
};
export const keyLabel = (s) => short[s] || s;
const keyboardLabels = new Map(
  PRINTED_KEYS.filter((k) => k.triple[0] === 32).map((k) => [
    k.triple[2] || 0xe0 + Math.log2(k.triple[1]),
    keyLabel(k.label),
  ]),
);
const consumer = {
  0xb6: "Previous track",
  0xb5: "Next track",
  0xcd: "Play / pause",
  0xb7: "Stop",
  0xe2: "Mute",
  0xe9: "Volume +",
  0xea: "Volume −",
  0x6f: "Brightness +",
  0x70: "Brightness −",
  0x221: "Search",
};
export function bindingLabel(b, layers = []) {
  if (!b) return "Unassigned";
  const id = b.behaviorId;
  if (id === IDS.key_press) {
    const page = (b.param1 >>> 16) & 255,
      u = b.param1 & 65535,
      mods = b.param1 >>> 24;
    let key =
      page === 12
        ? consumer[u] || `Media ${u}`
        : keyboardLabels.get(u) || KEY_SYMBOLS[(page << 16) | u] || `Key ${u}`;
    return [
      ...[
        "Ctrl",
        "Shift",
        "Alt",
        "Win",
        "RCtrl",
        "RShift",
        "RAlt",
        "RWin",
      ].filter((_, i) => mods & (1 << i)),
      key,
    ].join(" + ");
  }
  if (id === IDS.bluetooth)
    return b.param1 === 3
      ? `BT ${b.param2 + 1}`
      : [
          "Clear pairing",
          "Next BT",
          "Previous BT",
          "Select BT",
          "Clear all BT",
          "Disconnect BT",
        ][b.param1] || "Bluetooth";
  if (id === IDS.outputs)
    return (
      ["Toggle output", "USB output", "Bluetooth output", "No output"][
        b.param1
      ] || "Output"
    );
  if (id === IDS.transparent) return "▽";
  if (id === IDS.none) return "—";
  if ([IDS.momentary_layer, IDS.toggle_layer, IDS.to_layer].includes(id)) {
    const name =
      layers.find((l) => l.id === b.param1)?.name || `Layer ${b.param1}`;
    return id === IDS.momentary_layer
      ? name
      : `${id === IDS.toggle_layer ? "Toggle" : "To"} ${name}`;
  }
  if (id === IDS.bcklight)
    return (
      [
        "Light on",
        "Light off",
        "Light toggle",
        "Light +",
        "Light −",
        "Light cycle",
        "Light set",
      ][b.param1] || "Backlight"
    );
  if (id === IDS.studio_unlock) return "Unlock";
  if (id === IDS.prev_firmware) return "Stock (3s)";
  return "Custom";
}
function parameterOK(value, spec, layerIds) {
  if (!spec?.length) return value === 0;
  return spec.some((s) =>
    s.constant !== undefined
      ? value === s.constant
      : s.range
        ? value >= s.range.min && value <= s.range.max
        : s.layerId
          ? layerIds.includes(value)
          : s.nil
            ? value === 0
            : s.hidUsage
              ? (value & 65535) > 0 &&
                ((((value >>> 16) & 255) === 7 &&
                  (value & 65535) <= s.hidUsage.keyboardMax) ||
                  (((value >>> 16) & 255) === 12 &&
                    (value & 65535) <= s.hidUsage.consumerMax))
              : false,
  );
}
export function supportsBinding(binding, behaviors, layers) {
  const d = Object.values(behaviors).find((b) => b.id === binding.behaviorId);
  if (!d) return false;
  return (d.metadata?.length ? d.metadata : [{ param1: [], param2: [] }]).some(
    (s) =>
      parameterOK(
        binding.param1,
        s.param1,
        layers.map((l) => l.id),
      ) &&
      parameterOK(
        binding.param2,
        s.param2,
        layers.map((l) => l.id),
      ),
  );
}
const binding = (name, param1 = 0, param2 = 0) => ({
  behaviorId: IDS[name],
  param1: param1 >>> 0,
  param2,
});
export function basicAction(k, layers) {
  return k.triple[0] === 160
    ? {
        label: "Fn",
        binding: binding(
          "momentary_layer",
          layers.find((l) => l.name?.trim().toLowerCase() === "fn")?.id ??
            0xffffffff,
        ),
      }
    : {
        label: keyLabel(k.label),
        binding: binding(
          "key_press",
          0x70000 | (k.triple[2] || 0xe0 + Math.log2(k.triple[1])),
        ),
      };
}
export function functionActions() {
  return [
    ...Array.from({ length: 4 }, (_, i) => ({
      label: `Bluetooth ${i + 1}`,
      group: "Bluetooth profiles",
      binding: binding("bluetooth", 3, i),
    })),
    {
      label: "Clear current pairing",
      group: "Bluetooth profiles",
      binding: binding("bluetooth", 0, 0),
    },
    ...[
      ["Use USB", 1],
      ["Use Bluetooth", 2],
      ["Toggle USB / Bluetooth", 0],
    ].map(([label, cmd]) => ({
      label,
      group: "Output",
      binding: binding("outputs", cmd),
    })),
    ...Object.entries(consumer).map(([u, label]) => ({
      label,
      group: Number(u) < 0xb0 ? "Display" : "Media",
      binding: binding("key_press", 0xc0000 | Number(u)),
    })),
    ...["On", "Off", "Toggle", "Brighter", "Dimmer", "Cycle"].map((s, i) => ({
      label: s,
      group: "Backlight",
      binding: binding("bcklight", i),
    })),
  ];
}
export function layerActions(layers) {
  return [
    ["momentary_layer", "Hold to activate"],
    ["toggle_layer", "Tap to toggle"],
    ["to_layer", "Tap to switch"],
  ].flatMap(([name, group]) =>
    layers.map((l) => ({
      label: l.name || `Layer ${l.id}`,
      group,
      binding: binding(name, l.id),
    })),
  );
}
export function shortcutActions(mac = false) {
  const mods = mac ? 8 : 1;
  return [
    ["Copy", 6],
    ["Paste", 25],
    ["Cut", 27],
    ["Undo", 29],
    ["Redo", 28],
    ["Select all", 4],
    ["Find", 9],
    ["Save", 22],
    ["New tab", 23],
    ["Close tab", 26],
  ].map(([label, u]) => ({
    label,
    group: "Everyday shortcuts",
    binding: binding("key_press", (mods << 24) | 0x70000 | u),
  }));
}
export function specialActions() {
  return [
    ["Use lower layer", "transparent"],
    ["Disable key", "none"],
    ["Unlock Studio", "studio_unlock"],
    ["Return to stock (hold 3s)", "prev_firmware"],
  ].map(([label, name]) => ({
    label,
    group: "Special actions",
    binding: binding(name),
  }));
}
export function customShortcut(usage, mods) {
  return binding("key_press", (mods << 24) | 0x70000 | usage);
}
