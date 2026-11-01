"""Stage pinned Studio with the project-owned Edge interface; preserve vendor input."""
from pathlib import Path
import os
import shutil
import re

ROOT = Path(__file__).resolve().parents[1]
source = ROOT/'.deps/zmk-studio'
stage = ROOT/'build/tmp/studio-ui-edge'
shutil.copytree(source, stage, dirs_exist_ok=True,
                ignore=shutil.ignore_patterns('.git','node_modules','dist','src-tauri'))
modules = stage/'node_modules'
if not modules.exists():
    modules.symlink_to(source/'node_modules', target_is_directory=True)
shutil.copyfile(ROOT/'web/studio-extension/KeymapExport.tsx', stage/'src/KeymapExport.tsx')
shutil.copyfile(ROOT/'web/studio-extension/KeymapImport.tsx', stage/'src/KeymapImport.tsx')
extension = stage/'src/edge-export'
extension.mkdir(exist_ok=True)
for name in ('keymap-export.js','keymap-export-symbols.js','keymap-import.js','layout.js','studio-actions.js'):
    shutil.copyfile(ROOT/'web/dist'/name, extension/name)
shutil.copyfile(ROOT/'web/studio-extension/keymap-export.d.ts',extension/'keymap-export.d.ts')
shutil.copyfile(ROOT/'web/studio-extension/keymap-import.d.ts',extension/'keymap-import.d.ts')
shutil.copyfile(ROOT/'web/studio-extension/edge-actions.d.ts',extension/'studio-actions.d.ts')
keyboard = stage/'src/keyboard/Keyboard.tsx'
text = keyboard.read_text()
text = 'import { EdgeWorkspace } from "../EdgeWorkspace";\nimport { useSub } from "../usePubSub";\n' + text
# Replace the unbounded independent reads with one validated, bounded snapshot.
a = text.index('function useBehaviors()')
b = text.index('export default function Keyboard()', a)
text = text[:a] + text[b:]
a = text.index('  const [\n    layouts,', text.index('export default function Keyboard()'))
b = text.index('  const [keymapScale', a)
text = text[:a] + '  const { layouts, selectedPhysicalLayoutIndex, setSelectedPhysicalLayoutIndex, keymap, setKeymap, behaviors, loadingError, retry } = useEdgeKeymapData();\n\n' + text[b:]
text = text.replace('  const behaviors = useBehaviors();', '')
text = 'import { useEdgeKeymapData } from "../useEdgeKeymapData";\n' + text
text = text.replace('import React, {', 'import {').replace('  SetStateAction,\n', '').replace('  PhysicalLayout,\n', '')
for obsolete in ['import { Request } from "@zmkfirmware/zmk-studio-ts-client";', 'import { useConnectedDeviceData } from "../rpc/useConnectedDeviceData";', 'import { LockStateContext } from "../rpc/LockStateContext";', 'import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";', 'import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";', 'type BehaviorMap = Record<number, GetBehaviorDetailsResponse>;']:
    text = text.replace(obsolete, '')
text = text.replace('selectedPhysicalLayoutIndex, setSelectedPhysicalLayoutIndex, keymap', 'selectedPhysicalLayoutIndex, keymap')
a = text.index('  useEffect(() => {\n    async function performSetRequest()')
b = text.index('  let doSelectPhysicalLayout', a)
text = text[:a] + text[b:]


for line in ('import { LayerPicker } from "./LayerPicker";','import { PhysicalLayoutPicker } from "./PhysicalLayoutPicker";','import { Keymap as KeymapComp } from "./Keymap";','import { BehaviorBindingPicker } from "../behaviors/BehaviorBindingPicker";','import { deserializeLayoutZoom, LayoutZoom } from "./PhysicalLayout";','import { useLocalStorageState } from "../misc/useLocalStorageState";'):
    text = text.replace(line,'')
a = text.index('  const [keymapScale, setKeymapScale]')
b = text.index('  const [selectedLayerIndex',a)
text = text[:a]+'  useSub("edge.keymap.imported", (fresh: Keymap) => setKeymap(fresh));\n\n'+text[b:]
a = text.index('  let doSelectPhysicalLayout')
b = text.index('  let doUpdateBinding',a)
text = text[:a]+text[b:]
a = text.index('  let selectedBinding = useMemo')
b = text.index('  const moveLayer',a)
text = text[:a]+text[b:]
text = text.replace('  useMemo,','')
text = text.replace('    setSelectedPhysicalLayoutIndex,\n  ] = useLayouts();','    _setSelectedPhysicalLayoutIndex,\n  ] = useLayouts();')
text = text.replace('      undoRedo?.(', '      return undoRedo?.(').replace('    undoRedo?.(', '    return undoRedo?.(')
text = text.replace('console.error("Failed to set binding", resp.keymap?.setLayerBinding);','throw new Error("The keyboard refused this key assignment.");')
text = text.replace('          } else {\n          }','          } else {\n            throw new Error("The keyboard refused to undo this assignment.");\n          }')
text = text.replace('console.error("Error moving", resp);','throw new Error("The keyboard refused the layer move.");')
a = text.index('  return (\n    <div className="grid grid-cols-[auto_1fr]')
text = text[:a]+'  return <EdgeWorkspace keymap={keymap} layout={layouts?.[selectedPhysicalLayoutIndex]} behaviors={behaviors} selectedLayerIndex={selectedLayerIndex} selectedKeyPosition={selectedKeyPosition} onLayer={setSelectedLayerIndex} onKey={setSelectedKeyPosition} onBinding={doUpdateBinding} onAdd={addLayer} onRemove={removeLayer} onMove={moveLayer} onRename={changeLayerName} loadingError={loadingError} onRetry={retry}/>;\n}\n'
keyboard.write_text(text)
app = stage/'src/App.tsx'
text = app.read_text()
anchor = '  const [doIt, undo, redo, canUndo, canRedo, reset] = useUndoRedo();'
assert text.count(anchor)==1
text = text.replace(anchor,anchor+'\n  useSub("edge.keymap.imported", () => reset());')
anchor = '  const [connectionAbort, setConnectionAbort] = useState(new AbortController());'
assert text.count(anchor)==1
text = text.replace(anchor,anchor+'\n  useSub("edge.import.abort", () => { connectionAbort.abort("Import request timed out"); setConn({conn:null}); setConnectionAbort(new AbortController()); });')
text = text.replace('className="bg-base-100 text-base-content h-full max-h-[100vh] w-full max-w-[100vw] inline-grid grid-cols-[auto] grid-rows-[auto_1fr_auto] overflow-hidden"','className="edge-studio"')
text = text.replace('!resp.keymap?.saveChanges || resp.keymap?.saveChanges.err','resp.keymap?.saveChanges?.ok !== true')
text = text.replace('    doSave();','    return doSave();').replace('    doDiscard();','    return doDiscard();').replace('    doReset();','    return doReset();')
text = text.replace('console.error("Failed to save changes", resp.keymap?.saveChanges);','throw new Error("The keyboard did not save the changes. Keep this page open and check the connection.");')
text = text.replace('console.error("Failed to discard changes", resp);','throw new Error("The keyboard did not discard the changes.");')
text = text.replace('console.error("Failed to settings reset", resp);','throw new Error("The keyboard did not restore its defaults.");')
# Connection help belongs below the header, not above the application shell.
a = text.index('          <UnlockModal />')
b = text.index('          <AboutModal',a)
connection_help = text[a:b].replace('          <UnlockModal />\n', '')
text = text.replace('          <UnlockModal />\n', '')
a = text.index('          <ConnectModal')
b = text.index('          <AboutModal', a)
text = text[:a]+'          <UnlockModal />\n'+text[b:]
anchor = '              onResetSettings={resetSettings}\n            />'
assert text.count(anchor)==1
text = text.replace(anchor,anchor+'\n'+connection_help)
# Retry uses a fresh transport: aborting releases an RPC read stalled in the client mutex.
anchor = '  return (\n    <ConnectionContext.Provider'
assert text.count(anchor) == 1
text = text.replace(anchor, '  useSub("edge.keymap.retry", async () => {\n    connectionAbort.abort("Retry keymap read");\n    setConn({conn:null});\n    setConnectionAbort(new AbortController());\n    const usb = TRANSPORTS.find(t => t.label === "USB");\n    if (usb?.connect) {\n      try { onConnect(await usb.connect()); } catch (error) { if (error instanceof Error && error.name !== "NotFoundError") void usePub()("edge.connection.error", "Retry failed: " + error.message); }\n    }\n  });\n\n' + anchor)
app.write_text(text)
# Project-owned presentation replaces only staged upstream views.
for source_name, dest_name in [('useEdgeKeymapData.ts','useEdgeKeymapData.ts'),('EdgeWorkspace.tsx','EdgeWorkspace.tsx'),('EdgeHeader.tsx','AppHeader.tsx'),('EdgeHeaderTypes.ts','EdgeHeaderTypes.ts'),('EdgeConnect.tsx','ConnectModal.tsx'),('EdgeUnlock.tsx','UnlockModal.tsx'),('edge-studio.css','edge-studio.css')]:
    shutil.copyfile(ROOT/'web/studio-extension'/source_name,stage/'src'/dest_name)
footer=stage/'src/AppFooter.tsx'
footer.write_text(footer.read_text().replace('<div className="grid justify-center p-1 bg-base-200">','<footer className="grid justify-center p-1 bg-base-200">').replace('    </div>\n  );','    </footer>\n  );'))
main=stage/'src/main.tsx'
main.write_text(main.read_text()+"\nimport './edge-studio.css';\n")
# Keep dialogs legible and the UI consistently dark. Preserve upstream tooling.
config=stage/'tailwind.config.js'
c=config.read_text().replace('xs: "0.4rem"','xs: "0.75rem", sm: "0.8125rem", base: "0.875rem", lg: "1.125rem", xl: "1.25rem"')
replacements=['#d39a68','#18181a','#b9b9bd','#c4a487','#e9e9e7','#171718','#111112','#222225']
for color in replacements:
    c=re.sub(r'"light-dark\([^;]+?\)"',lambda m:'"'+color+'"',c,count=1)
config.write_text(c)
# Failed edits must release the upstream undo lock so retry stays possible.
undo=stage/'src/undoRedo.ts'
u=undo.read_text().replace('    let undo = await doCb();','    try {\n    let undo = await doCb();').replace('    setLocked(false);\n  };','    } finally { setLocked(false); }\n  };',1)
u=u.replace('    setUndoStack(undoStack.slice(1));\n    setRedoStack([doCb, ...redoStack]);\n\n    await undoCb();','    await undoCb();\n    setUndoStack(undoStack.slice(1));\n    setRedoStack([doCb, ...redoStack]);')
u=u.replace('    let [doCb, undoCb] = undoStack[0];','    try {\n    let [doCb, undoCb] = undoStack[0];').replace('    setLocked(false);\n  };','    } finally { setLocked(false); }\n  };',1)
undo.write_text(u)
# One source for navigation/tokens; Vite copies these public assets unchanged.
(stage/'public').mkdir(exist_ok=True)
for shared in ('edge-shell.js', 'edge-design.css'):
    shutil.copyfile(ROOT/'web/dist'/shared, stage/'public'/shared)
html=stage/'index.html'
base=os.environ.get('EDGE_SITE_BASE','').rstrip('/')
html.write_text(html.read_text().replace('<title>ZMK Studio</title>','<title>Edge Studio</title>').replace('<body>', '<body class="edge-suite edge-editor"><edge-risk-notice></edge-risk-notice>').replace('</head>', '<link rel="stylesheet" href="'+base+'/edge-design.css?v=6">\n<script type="module" src="'+base+'/edge-shell.js?v=5"></script>\n</head>'))
print(f'Staged upstream Studio with the Edge interface: {stage}')
# Shared module is served at the site root rather than bundled into Studio.
vite=stage/'vite.config.ts'
v= vite.read_text().replace('    rollupOptions: {','    rollupOptions: {\n      external: (id: string) => id.includes("edge-shell.js"),').replace('        download: "./download.html",\n','')
vite.write_text(v)
