import { useContext, useEffect, useRef, useState } from "react";
import type {
  Keymap,
  PhysicalLayout,
  BehaviorBinding,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import {
  Keyboard,
  SlidersHorizontal,
  Command,
  Layers,
  Settings2,
  Search,
  Plus,
  ChevronRight,
  Pencil,
  ArrowUp,
  ArrowDown,
  Trash2,
  X,
} from "lucide-react";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { LockStateContext } from "./rpc/LockStateContext";
import { ConnectionContext } from "./rpc/ConnectionContext";
import { usePub, useSub } from "./usePubSub";
import { BehaviorBindingPicker } from "./behaviors/BehaviorBindingPicker";
import {
  PRINTED_KEYS,
  IDS,
  keyLabel,
  bindingLabel,
  basicAction,
  functionActions,
  layerActions,
  shortcutActions,
  specialActions,
  supportsBinding,
  customShortcut,
  type Action,
} from "./edge-export/studio-actions.js";

type Props = {
  loadingError?: string;
  onRetry: () => unknown;
  keymap: Keymap | null | undefined;
  layout?: PhysicalLayout;
  behaviors: Record<number, GetBehaviorDetailsResponse>;
  selectedLayerIndex: number;
  selectedKeyPosition?: number;
  onLayer: (i: number) => void;
  onKey: (i: number) => void;
  onBinding: (b: BehaviorBinding) => unknown;
  onAdd: () => unknown;
  onRemove: () => unknown;
  onMove: (start: number, end: number) => unknown;
  onRename: (id: number, oldName: string, newName: string) => unknown;
};
const tabs = [
  ["Basic", Keyboard],
  ["Functions", SlidersHorizontal],
  ["Shortcuts", Command],
  ["Layers", Layers],
  ["Advanced", Settings2],
] as const;
const initialGeometry = PRINTED_KEYS.map((k) => ({
  ...k,
  x: k.x / 26,
  y: k.y / 26,
  width: k.width / 26,
  height: k.height / 26,
}));
export function EdgeWorkspace(p: Props) {
  const conn = useContext(ConnectionContext),
    lock = useContext(LockStateContext);
  const [category, setCategory] = useState("Basic"),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [mac, setMac] = useState(false);
  const [externalBusy, setExternalBusy] = useState(false);
  useSub("edge.ui.busy", (value) => {
    setExternalBusy(value);
    if (value) {
      setNotice("");
      setError("");
    }
  });
  const publish = usePub();
  const [modal, setModal] = useState<"rename" | "remove" | "shortcut" | null>(
      null,
    ),
    [name, setName] = useState(""),
    [mods, setMods] = useState(1),
    [usage, setUsage] = useState(6);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    setError("");
    setNotice("");
    setModal(null);
  }, [conn, lock]);
  const map = p.keymap,
    layers = map?.layers || [],
    layer = layers[p.selectedLayerIndex],
    selected = p.selectedKeyPosition,
    selectedBinding =
      selected === undefined ? undefined : layer?.bindings[selected];
  const unlocked =
    !!conn.conn && lock === LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED;
  const ready = unlocked && !!map && !busy && !externalBusy;
  const canAssign = ready && selected !== undefined && !!selectedBinding;
  const geometry =
    p.layout?.keys.map((k) => ({
      x: k.x / 100,
      y: k.y / 100,
      width: k.width / 100,
      height: k.height / 100,
    })) || initialGeometry;
  const right = Math.max(...geometry.map((k) => k.x + k.width)),
    bottom = Math.max(...geometry.map((k) => k.y + k.height));
  async function run(action: () => unknown, message: string) {
    setBusy(true);
    setError("");
    try {
      await publish("edge.ui.busy", true);
      await action();
      setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      await publish("edge.ui.busy", false);
    }
  }
  function assign(action: Action) {
    if (canAssign && supportsBinding(action.binding, p.behaviors, layers))
      void run(
        () => p.onBinding(action.binding),
        `${action.label} assigned. Save to keep your changes.`,
      );
  }
  function available(actions: Action[]) {
    return actions.filter(
      (a) =>
        supportsBinding(a.binding, p.behaviors, layers) &&
        (!query ||
          `${a.label} ${a.group || ""} ${bindingLabel(a.binding, layers)}`
            .toLowerCase()
            .includes(query.toLowerCase())),
    );
  }
  let actions =
    category === "Functions"
      ? functionActions()
      : category === "Layers"
        ? layerActions(layers)
        : category === "Shortcuts"
          ? shortcutActions(mac)
          : specialActions();
  const matching = available(actions),
    groups = [...new Set(matching.map((a) => a.group || "Actions"))];
  const currentLabel = selectedBinding
    ? bindingLabel(selectedBinding, layers)
    : "";
  const printed =
    selected === undefined
      ? ""
      : PRINTED_KEYS[selected]?.label || `Key ${selected + 1}`;
  if (!conn.conn) return null;
  if (unlocked && p.loadingError) return (
    <main className="edge-load-error" aria-labelledby="edge-load-error-title">
      <div role="alert">
        <span className="edge-eyebrow">KEYMAP READ FAILED</span>
        <h1 id="edge-load-error-title">Couldn’t read your keymap</h1>
        <p>{p.loadingError}</p>
      </div>
      <p className="edge-load-error-note">Retry reconnects over USB and reads the keyboard again. You may need to select your keyboard and unlock it again.</p>
      <button className="edge-button edge-button-primary" onClick={() => void p.onRetry()}>Retry</button>
    </main>
  );

  if (unlocked && (!map || !p.layout || Object.keys(p.behaviors).length === 0)) {
    return (
      <main className="edge-loading-workspace" aria-busy="true" aria-label="Loading keyboard mappings">
        <div role="status" className="edge-loading-status">
          <span className="edge-eyebrow">READING KEYBOARD</span>
          <h1>Loading your keymap</h1>
          <p>Reading mappings, layers and supported actions from your keyboard.</p>
        </div>
        <div className="edge-skeleton-layout" aria-hidden="true">
          <div className="edge-skeleton-layers"><span /><span /><span /></div>
          <div className="edge-skeleton-keyboard" style={{ aspectRatio: `${right} / ${bottom}` }}>
            {geometry.map((key, index) => <span key={index} style={{ left: `${key.x / right * 100}%`, top: `${key.y / bottom * 100}%`, width: `${key.width / right * 100}%`, height: `${key.height / bottom * 100}%` }} />)}
          </div>
        </div>
        <div className="edge-skeleton-toolbar" aria-hidden="true"><span /><span /><span /></div>
      </main>
    );
  }

  return (
    <main className="edge-workspace" aria-busy={busy}>
      <section className="edge-keyboard-area" aria-label="Keyboard layout">
        <div className="edge-workspace-heading">
          <div>
            <span className="edge-eyebrow">KEYMAP</span>
            <h1>
              Lofree Edge<span>84 keys · USB</span>
            </h1>
          </div>
          <span className="edge-map-source">
            {map ? "Live keymap" : "Keycap preview · connect to read mappings"}
          </span>
        </div>
        <div className="edge-layout-row">
          <aside className="edge-layer-rail" aria-label="Layers">
            <div className="edge-rail-heading">
              LAYERS
              <span>
                {layers.length
                  ? `${layers.length} / ${layers.length + (map?.availableLayers || 0)}`
                  : "3 max"}
              </span>
            </div>
            {(layers.length
              ? layers
              : [
                  { id: 0, name: "Base" },
                  { id: 1, name: "Fn" },
                ]
            ).map((l, i) => (
              <div
                className={`edge-layer-item ${i === p.selectedLayerIndex ? "is-selected" : ""}`}
                key={l.id}
              >
                <button
                  className="edge-layer-name"
                  disabled={!map || busy}
                  aria-pressed={i === p.selectedLayerIndex}
                  onClick={() => {
                    p.onLayer(i);
                    setNotice("");
                  }}
                >
                  <ChevronRight size={16} />
                  <span>{l.name || `Layer ${i + 1}`}</span>
                </button>
                {i === p.selectedLayerIndex && map && (
                  <button
                    className="edge-layer-edit"
                    aria-label="Edit layer"
                    disabled={!ready}
                    onClick={() => {
                      setName(l.name || "");
                      setModal("rename");
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            ))}
            <button
              className="edge-add-layer"
              disabled={!ready || !map?.availableLayers}
              onClick={() =>
                void run(p.onAdd, "Layer added. Save to keep your changes.")
              }
            >
              <Plus size={14} />
              Add layer
            </button>
            {map && !map.availableLayers && (
              <span className="edge-layer-limit">Three-layer limit</span>
            )}
          </aside>
          <div className="edge-board-column">
            <p className="edge-mobile-hint">
              Scroll sideways to see every key.
            </p>
            <div
              className="edge-board"
              style={{ aspectRatio: `${right + 0.4} / ${bottom + 0.4}` }}
            >
              <div
                className="edge-keybed"
                style={{ aspectRatio: `${right} / ${bottom}` }}
              >
                {geometry.map((k, i) => {
                  const b = layer?.bindings[i],
                    isTrans = b?.behaviorId === IDS.transparent,
                    label = b
                      ? bindingLabel(b, layers)
                      : keyLabel(PRINTED_KEYS[i]?.label || "");
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`edge-keycap ${selected === i ? "is-selected" : ""} ${isTrans ? "is-transparent" : ""} ${i === 0 ? "is-escape" : ""}`}
                      style={{
                        left: `${(k.x / right) * 100}%`,
                        top: `${(k.y / bottom) * 100}%`,
                        width: `${(k.width / right) * 100}%`,
                        height: `${(k.height / bottom) * 100}%`,
                      }}
                      disabled={!ready}
                      aria-label={`${PRINTED_KEYS[i]?.label || `Key ${i + 1}`} key: ${isTrans ? "Transparent" : label}`}
                      aria-pressed={selected === i}
                      title={`${PRINTED_KEYS[i]?.label || `Key ${i + 1}`} · ${isTrans ? "Transparent — uses an active lower layer" : label}`}
                      onClick={() => {
                        p.onKey(i);
                        setNotice("");
                      }}
                    >
                      <span>
                        {isTrans
                          ? keyLabel(PRINTED_KEYS[i]?.label || "")
                          : label}
                      </span>
                      {isTrans && <small>▽</small>}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="edge-keyboard-hint">
              {!map ? (
                "Connect and unlock your keyboard to load its current layers."
              ) : selected === undefined ? (
                "Select a key above, then choose an action below."
              ) : (
                <>
                  <span className="edge-selection-dot" />
                  Editing <strong>{printed}</strong> on{" "}
                  <strong>
                    {layer?.name || `Layer ${p.selectedLayerIndex + 1}`}
                  </strong>
                  <span className="edge-hint-divider">·</span>
                  {currentLabel === "▽"
                    ? "Uses an active lower layer"
                    : currentLabel}
                </>
              )}
            </p>
          </div>
        </div>
      </section>
      <section className="edge-action-dock" aria-label="Key actions">
        <div className="edge-dock-toolbar">
          <div role="tablist" aria-label="Action categories">
            {tabs.map(([name, Icon]) => (
              <button
                key={name}
                id={`tab-${name}`}
                role="tab"
                aria-selected={category === name}
                aria-controls="edge-action-panel"
                tabIndex={category === name ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                    const next =
                      (tabs.findIndex((t) => t[0] === category) +
                        (e.key === "ArrowRight" ? 1 : tabs.length - 1)) %
                      tabs.length;
                    setCategory(tabs[next][0]);
                    setQuery("");
                    document.getElementById(`tab-${tabs[next][0]}`)?.focus();
                  }
                }}
                onClick={() => {
                  setCategory(name);
                  setQuery("");
                }}
              >
                <Icon size={17} />
                {name}
              </button>
            ))}
          </div>
          <label className="edge-search">
            <Search size={15} />
            <input
              aria-label="Search actions"
              placeholder="Search actions"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={13} />
              </button>
            )}
          </label>
        </div>
        <div
          className="edge-action-body"
          role="tabpanel"
          id="edge-action-panel"
          aria-labelledby={`tab-${category}`}
        >
          <div className="edge-palette-heading">
            <h2>
              {category === "Basic"
                ? "Keys"
                : category === "Functions"
                  ? "Keyboard functions"
                  : category === "Layers"
                    ? "Layer switching"
                    : category === "Shortcuts"
                      ? "Shortcuts"
                      : "Special actions"}
            </h2>
            {category === "Shortcuts" ? (
              <div className="edge-shortcut-options">
                <label>
                  Modifier
                  <select
                    aria-label="Shortcut modifier"
                    value={mac ? "mac" : "ctrl"}
                    onChange={(e) => setMac(e.target.value === "mac")}
                  >
                    <option value="ctrl">Ctrl</option>
                    <option value="mac">⌘ Command</option>
                  </select>
                </label>
                <button
                  className="edge-text-button"
                  disabled={!canAssign}
                  onClick={() => setModal("shortcut")}
                >
                  <Plus size={14} />
                  Custom shortcut
                </button>
              </div>
            ) : (
              <p>
                {canAssign
                  ? "Click an action to assign it to the selected key."
                  : "Select a key to assign an action."}
              </p>
            )}
          </div>
          {category === "Basic" ? (
            <>
              <div className="edge-basic-scroll">
                <div
                  className="edge-basic-palette"
                  style={{ aspectRatio: "419 / 156" }}
                >
                  {PRINTED_KEYS.map((k, i) => {
                    const action = basicAction(k, layers),
                      supported = supportsBinding(
                        action.binding,
                        p.behaviors,
                        layers,
                      ),
                      matches =
                        !query ||
                        `${action.label} ${k.label}`
                          .toLowerCase()
                          .includes(query.toLowerCase());
                    return (
                      <button
                        key={i}
                        className={`edge-palette-key ${matches ? "" : "is-filtered"}`}
                        disabled={
                          !canAssign ||
                          (!supported && k.triple[0] !== 160) ||
                          !matches
                        }
                        title={
                          k.triple[0] === 160
                            ? "Choose a layer action"
                            : `Assign ${k.label}`
                        }
                        aria-label={`Assign ${k.label}`}
                        style={{
                          left: `${(k.x / 419) * 100}%`,
                          top: `${(k.y / 156) * 100}%`,
                          width: `${(k.width / 419) * 100}%`,
                          height: `${(k.height / 156) * 100}%`,
                        }}
                        onClick={() => {
                          if (k.triple[0] === 160) {
                            setCategory("Layers");
                            setQuery("");
                          } else assign(action);
                        }}
                      >
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="edge-palette-footnote">
                All supported behaviors are available in Advanced.
              </p>
            </>
          ) : groups.length ? (
            groups.map((group) => (
              <div className="edge-action-group" key={group}>
                <h3>{group}</h3>
                <div className="edge-action-grid">
                  {matching
                    .filter((a) => (a.group || "Actions") === group)
                    .map((a) => (
                      <button
                        key={`${a.binding.behaviorId}-${a.binding.param1}`}
                        disabled={!canAssign}
                        className="edge-action-card"
                        onClick={() => assign(a)}
                        title={bindingLabel(a.binding, layers)}
                      >
                        {a.label}
                        {category === "Layers" && (
                          <small>
                            {group === "Hold to activate"
                              ? "While held"
                              : group === "Tap to toggle"
                                ? "On / off"
                                : "Switch layer"}
                          </small>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            ))
          ) : (
            <p className="edge-empty-actions">
              {!map
                ? "Actions will appear after you connect and unlock."
                : "No matching supported actions."}
            </p>
          )}
          {category === "Advanced" && selectedBinding && selectedBinding.behaviorId !== IDS.outputs && (
            <details className="edge-advanced-editor">
              <summary>Advanced action editor</summary>
              <BehaviorBindingPicker
                binding={selectedBinding}
                behaviors={Object.values(p.behaviors).filter(b => b.id !== IDS.outputs)}
                layers={layers.map((l, i) => ({
                  id: l.id,
                  name: l.name || `Layer ${i + 1}`,
                }))}
                onBindingChanged={(b) =>
                  assign({ label: bindingLabel(b, layers), binding: b })
                }
              />
            </details>
          )}
          {error && (
            <div role="alert" className="edge-inline-error">
              {error}
            </div>
          )}
          <p role="status" className="edge-action-status">
            {busy
              ? "Updating keyboard…"
              : notice ||
                "Edits apply immediately. Save writes changes to device storage."}
          </p>
        </div>
      </section>
      <dialog
        ref={dialog}
        className="edge-dialog"
        onCancel={() => setModal(null)}
        onClose={() => setModal(null)}
      >
        <div className="edge-dialog-heading">
          <h2>
            {modal === "shortcut"
              ? "Custom shortcut"
              : modal === "remove"
                ? "Delete this layer?"
                : "Edit layer"}
          </h2>
          <button aria-label="Close dialog" onClick={() => setModal(null)}>
            <X size={20} />
          </button>
        </div>
        {modal === "rename" && layer && (
          <>
            <label>
              Layer name
              <input
                aria-label="Layer name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="edge-layer-management">
              <button
                disabled={!ready || p.selectedLayerIndex === 0}
                onClick={() => {
                  setModal(null);
                  void run(
                    () =>
                      p.onMove(p.selectedLayerIndex, p.selectedLayerIndex - 1),
                    "Layer moved. Save to keep your changes.",
                  );
                }}
              >
                <ArrowUp size={15} />
                Move up
              </button>
              <button
                disabled={!ready || p.selectedLayerIndex === layers.length - 1}
                onClick={() => {
                  setModal(null);
                  void run(
                    () =>
                      p.onMove(p.selectedLayerIndex, p.selectedLayerIndex + 1),
                    "Layer moved. Save to keep your changes.",
                  );
                }}
              >
                <ArrowDown size={15} />
                Move down
              </button>
              <button
                className="edge-danger-text"
                disabled={!ready || layers.length < 2}
                onClick={() => setModal("remove")}
              >
                <Trash2 size={15} />
                Delete layer
              </button>
            </div>
          </>
        )}
        {modal === "remove" && (
          <p>
            This removes <strong>{layer?.name}</strong> and all its key
            assignments. You can undo it before saving.
          </p>
        )}
        {modal === "shortcut" && (
          <>
            <p>Choose modifiers and a key for this shortcut.</p>
            <div className="edge-modifiers">
              {["Ctrl", "Shift", "Alt", "Win / ⌘"].map((s, i) => (
                <label key={s}>
                  <input
                    type="checkbox"
                    checked={!!(mods & (1 << i))}
                    onChange={(e) =>
                      setMods(
                        e.target.checked ? mods | (1 << i) : mods & ~(1 << i),
                      )
                    }
                  />
                  {s}
                </label>
              ))}
            </div>
            <label>
              Key
              <select
                aria-label="Shortcut key"
                value={usage}
                onChange={(e) => setUsage(Number(e.target.value))}
              >
                {PRINTED_KEYS.filter(
                  (k) => k.triple[0] === 32 && k.triple[2],
                ).map((k) => (
                  <option value={k.triple[2]} key={k.slot}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="edge-shortcut-preview">
              {bindingLabel(customShortcut(usage, mods), layers)}
            </div>
          </>
        )}
        <div className="edge-dialog-actions">
          <button className="edge-button" onClick={() => setModal(null)}>
            Cancel
          </button>
          <button
            className={`edge-button ${modal === "remove" ? "edge-button-danger" : "edge-button-primary"}`}
            disabled={
              !ready ||
              (modal === "shortcut" &&
                (!canAssign ||
                  !supportsBinding(
                    customShortcut(usage, mods),
                    p.behaviors,
                    layers,
                  ))) ||
              (modal === "rename" &&
                (!name.trim() ||
                  new TextEncoder().encode(name).length >
                    (map?.maxLayerNameLength || 16)))
            }
            onClick={() => {
              if (modal === "shortcut")
                assign({
                  label: bindingLabel(customShortcut(usage, mods), layers),
                  binding: customShortcut(usage, mods),
                });
              else if (modal === "remove")
                void run(
                  p.onRemove,
                  "Layer deleted. Save to keep your changes.",
                );
              else if (layer)
                void run(
                  () => p.onRename(layer.id, layer.name || "", name),
                  "Layer renamed. Save to keep your changes.",
                );
              setModal(null);
            }}
          >
            {modal === "shortcut"
              ? "Assign shortcut"
              : modal === "remove"
                ? "Delete layer"
                : "Rename layer"}
          </button>
        </div>
      </dialog>
    </main>
  );
}
