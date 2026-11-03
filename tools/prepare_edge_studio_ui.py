"""Stage pinned Studio with the project-owned Edge interface; preserve vendor input."""
from pathlib import Path
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
for name in ('keymap-export.js','keymap-export-symbols.js','keymap-import.js','layout.js','studio-actions.js','unlock-guard.js','keymap-draft.js'):
    shutil.copyfile(ROOT/'web/dist'/name, extension/name)
shutil.copyfile(ROOT/'web/studio-extension/keymap-export.d.ts',extension/'keymap-export.d.ts')
shutil.copyfile(ROOT/'web/studio-extension/keymap-import.d.ts',extension/'keymap-import.d.ts')
shutil.copyfile(ROOT/'web/studio-extension/unlock-guard.d.ts',extension/'unlock-guard.d.ts')
shutil.copyfile(ROOT/'web/studio-extension/keymap-draft.d.ts',extension/'keymap-draft.d.ts')
shutil.copyfile(ROOT/'web/studio-extension/edge-actions.d.ts',extension/'studio-actions.d.ts')
shutil.copyfile(ROOT/'web/studio-extension/EdgeKeyboard.tsx',stage/'src/EdgeKeyboard.tsx')
app = stage/'src/App.tsx'
text = app.read_text().replace('from "@zmkfirmware/zmk-studio-ts-client/transport/serial";', 'from "./edge-serial";')
text = 'import { EdgeDraftProvider, useKeymapDraft } from "./EdgeDraft";\nimport { securityRpc } from "./edge-security-rpc";\n' + text
text = text.replace('import Keyboard from "./keyboard/Keyboard";', 'import Keyboard from "./EdgeKeyboard";')
text = text.replace('if (!conn) {', 'if (!conn.conn) {')
text = text.replace('      const ac = new AbortController();', '      setLockState(LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED);\n      const ac = new AbortController();')
text = text.replace('function App() {', 'function App() {\n  const draft = useKeymapDraft(), publish = usePub();')
a=text.index('  const save = useCallback(');b=text.index('  const resetSettings = useCallback(',a)
text=text[:a]+'''  const save = useCallback(async () => {
    if (!conn.conn) return;
    const actual = await draft.store.save(r => call_rpc(conn.conn!, r), async () => (await securityRpc(conn.conn!)).requireUnlock !== 0);
    await publish("edge.keymap.imported", actual);
  }, [conn, draft.store]);
  const discard = useCallback(async () => {
    if (!conn.conn) { draft.store.discard(); return; }
    const actual = (await call_rpc(conn.conn, {keymap:{getKeymap:true}})).keymap?.getKeymap;
    if (!actual) throw new Error("Could not reload the keyboard. Your draft is still here.");
    draft.store.load(actual, true);
  }, [conn, draft.store]);
'''+text[b:]
text = text.replace('canUndo={canUndo}', 'canUndo={draft.canUndo}').replace('canRedo={canRedo}', 'canRedo={draft.canRedo}').replace('onUndo={undo}', 'onUndo={async () => draft.store.undo()}').replace('onRedo={redo}', 'onRedo={async () => draft.store.redo()}')
text = text.replace('      reset();\n      setConn', '      draft.store.clear();\n      reset();\n      setConn')
text = text.replace('export default App;', 'export default function EdgeApplication() { return <EdgeDraftProvider><App /></EdgeDraftProvider>; }')
anchor = '  const [doIt, undo, redo, canUndo, canRedo, reset] = useUndoRedo();'
assert text.count(anchor)==1
text = text.replace(anchor,'  const [doIt, , , , , reset] = useUndoRedo();\n  useSub("edge.keymap.imported", () => reset());')
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
for source_name, dest_name in [('edge-usb-diagnostics.ts','edge-usb-diagnostics.ts'),('EdgePubSub.ts','usePubSub.ts'),('edge-serial.ts','edge-serial.ts'),('EdgeDraft.tsx','EdgeDraft.tsx'),('EdgeSecurity.tsx','EdgeSecurity.tsx'),('edge-security-rpc.ts','edge-security-rpc.ts'),('EdgePower.tsx','EdgePower.tsx'),('edge-power-rpc.ts','edge-power-rpc.ts'),('useEdgeKeymapData.ts','useEdgeKeymapData.ts'),('EdgeWorkspace.tsx','EdgeWorkspace.tsx'),('EdgeHeader.tsx','AppHeader.tsx'),('EdgeHeaderTypes.ts','EdgeHeaderTypes.ts'),('EdgeConnect.tsx','ConnectModal.tsx'),('EdgeUnlock.tsx','UnlockModal.tsx'),('edge-studio.css','edge-studio.css')]:
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
# Shared assets are inserted after Vite so root and project-site paths stay exact.
for name in ('edge-shell.js','edge-design.css'):
    file=stage/'public'/name
    if file.exists():file.unlink()
html=stage/'index.html'
html.write_text(html.read_text().replace('<title>ZMK Studio</title>','<title>Edge Studio</title>').replace('<body>', '<body class="edge-suite edge-editor"><edge-risk-notice></edge-risk-notice>'))
vite=stage/'vite.config.ts'
v= vite.read_text().replace('        download: "./download.html",\n','')
vite.write_text(v)
print(f'Staged upstream Studio with the Edge interface: {stage}')
