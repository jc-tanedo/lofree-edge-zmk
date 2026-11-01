import test from "node:test";
import assert from "node:assert/strict";
import {
  IDS,
  edgeBehaviorMetadata,
  PRINTED_KEYS,
  basicAction,
  bindingLabel,
  functionActions,
  layerActions,
  shortcutActions,
  customShortcut,
  supportsBinding,
  specialActions,
} from "../dist/studio-actions.js";
const layers = [
  { id: 0, name: "Base" },
  { id: 2, name: "Fn" },
  { id: 1, name: "Navigation" },
];
const metadata = {
  [IDS.key_press]: {
    id: IDS.key_press,
    metadata: [
      {
        param1: [{ hidUsage: { keyboardMax: 231, consumerMax: 0x221 } }],
        param2: [{ nil: {} }],
      },
    ],
  },
  [IDS.momentary_layer]: {
    id: IDS.momentary_layer,
    metadata: [{ param1: [{ layerId: {} }], param2: [{ nil: {} }] }],
  },
  [IDS.transparent]: { id: IDS.transparent, metadata: [] },
};
test("physical key presets retain native dense position order, not visual order", () => {
  assert.equal(PRINTED_KEYS.length, 84);
  assert.equal(PRINTED_KEYS[44].label, "Delete");
  assert.equal(PRINTED_KEYS[76].label, "Space");
  assert.equal(PRINTED_KEYS[79].label, "Fn");
  assert.equal(basicAction(PRINTED_KEYS[44], layers).binding.param1, 0x7004c);
});
test("Fn and layer presets use stable native IDs after reordering", () => {
  assert.equal(basicAction(PRINTED_KEYS[79], layers).binding.param1, 2);
  const a = layerActions(layers).find(
    (a) => a.label === "Navigation" && a.group === "Hold to activate",
  );
  assert.equal(a.binding.param1, 1);
  assert.equal(bindingLabel(a.binding, layers), "Navigation");
});
test("modifier key presets and combined shortcuts encode different HID representations", () => {
  const ctrl = basicAction(
    PRINTED_KEYS.find((k) => k.label === "Left Ctrl"),
    layers,
  ).binding;
  assert.equal(ctrl.param1, 0x700e0);
  assert.equal(customShortcut(6, 1).param1, 0x01070006);
  assert.equal(bindingLabel(customShortcut(6, 1), layers), "Ctrl + C");
  assert.equal(shortcutActions(true)[0].binding.param1, 0x08070006);
});
test("media and backlight labels decode current native bindings", () => {
  const play = functionActions().find((a) => a.label === "Play / pause");
  assert.equal(play.binding.param1, 0xc00cd);
  assert.equal(bindingLabel(play.binding), "Play / pause");
  const light = functionActions().find((a) => a.label === "Toggle");
  assert.equal(light.binding.behaviorId, IDS.bcklight);
  assert.equal(light.binding.param1, 2);
});
test("palette checks actual advertised HID maxima and excludes unavailable behaviors", () => {
  assert.equal(
    supportsBinding(
      basicAction(PRINTED_KEYS[0], layers).binding,
      metadata,
      layers,
    ),
    true,
  );
  assert.equal(
    supportsBinding(
      { behaviorId: IDS.key_press, param1: 0xc0222, param2: 0 },
      metadata,
      layers,
    ),
    false,
  );
  assert.equal(
    supportsBinding(
      { behaviorId: IDS.key_press, param1: 0x700e8, param2: 0 },
      metadata,
      layers,
    ),
    false,
  );
  assert.equal(
    supportsBinding(
      functionActions().find((a) => a.label === "Toggle").binding,
      metadata,
      layers,
    ),
    false,
  );
});
test("no-parameter behaviors require zeros and layer targets must exist on device", () => {
  assert.equal(
    supportsBinding(
      { behaviorId: IDS.transparent, param1: 0, param2: 0 },
      metadata,
      layers,
    ),
    true,
  );
  assert.equal(
    supportsBinding(
      { behaviorId: IDS.transparent, param1: 1, param2: 0 },
      metadata,
      layers,
    ),
    false,
  );
  assert.equal(
    supportsBinding(
      { behaviorId: IDS.momentary_layer, param1: 3, param2: 0 },
      metadata,
      layers,
    ),
    false,
  );
  assert.equal(
    supportsBinding(
      { behaviorId: IDS.momentary_layer, param1: 2, param2: 0 },
      metadata,
      layers,
    ),
    true,
  );
});
test("special actions preserve explicit transparent/disabled meanings", () => {
  assert.equal(
    bindingLabel(
      specialActions().find((a) => a.label === "Use lower layer").binding,
    ),
    "▽",
  );
  assert.equal(
    bindingLabel(
      specialActions().find((a) => a.label === "Disable key").binding,
    ),
    "—",
  );
});

test("the Fn preset follows a named Fn layer rather than assuming its display position", () => {
  const reordered = [layers[0], layers[2], layers[1]];
  assert.equal(basicAction(PRINTED_KEYS[79], reordered).binding.param1, 2);
  const unnamed = [
    { id: 0, name: "Base" },
    { id: 1, name: "Symbols" },
  ];
  assert.equal(
    supportsBinding(
      basicAction(PRINTED_KEYS[79], unnamed).binding,
      metadata,
      unnamed,
    ),
    false,
  );
});

test("Bluetooth presets are gated by the device profile range and advertised outputs", () => {
  const bt = {
    ...metadata,
    [IDS.bluetooth]: {
      id: IDS.bluetooth,
      metadata: [
        { param1: [{ constant: 3 }], param2: [{ range: { min: 0, max: 2 } }] },
        { param1: [{ constant: 0 }], param2: [] },
      ],
    },
    [IDS.outputs]: {
      id: IDS.outputs,
      metadata: [
        {
          param1: [{ constant: 0 }, { constant: 1 }, { constant: 2 }],
          param2: [],
        },
      ],
    },
  };
  const options = functionActions();
  assert.equal(
    supportsBinding(
      options.find((a) => a.label === "Bluetooth 3").binding,
      bt,
      layers,
    ),
    true,
  );
  assert.equal(
    supportsBinding(
      {behaviorId: IDS.bluetooth, param1: 3, param2: 3},
      bt,
      layers,
    ),
    false,
  );
  assert.equal(
    supportsBinding(
      options.find((a) => a.label === "Bluetooth 1").binding,
      metadata,
      layers,
    ),
    false,
  );
  assert.equal(
    bindingLabel(options.find((a) => a.label === "Bluetooth 2").binding),
    "BT 2",
  );
  assert.equal(
    bindingLabel({behaviorId:IDS.outputs,param1:2,param2:0}),
    "Bluetooth output",
  );
  assert.equal(
    supportsBinding(
      {behaviorId:IDS.outputs,param1:2,param2:0},
      bt,
      layers,
    ),
    true,
  );
});

test("Edge exposes three profiles despite the native metadata's inclusive-count error", () => {
  const raw = { id: IDS.bluetooth, metadata: [{param1:[{constant:3}], param2:[{range:{min:0,max:3}}]}] };
  const fixed = edgeBehaviorMetadata(raw);
  assert.equal(raw.metadata[0].param2[0].range.max, 3, "must not mutate the RPC response");
  const definitions = {[IDS.bluetooth]:fixed};
  assert.equal(supportsBinding({behaviorId:IDS.bluetooth,param1:3,param2:2},definitions,layers),true);
  assert.equal(supportsBinding({behaviorId:IDS.bluetooth,param1:3,param2:3},definitions,layers),false);
  assert.equal(functionActions().filter(a=>a.binding.behaviorId===IDS.bluetooth && a.binding.param1===3).length,3);
  assert.ok(functionActions().every(a=>a.binding.behaviorId!==IDS.outputs));
});
