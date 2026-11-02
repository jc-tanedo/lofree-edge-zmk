import { useContext, useEffect, useRef, useState } from 'react';
import { call_rpc } from '@zmkfirmware/zmk-studio-ts-client';
import type { Keymap } from '@zmkfirmware/zmk-studio-ts-client/keymap';
import { LockState } from '@zmkfirmware/zmk-studio-ts-client/core';
import { ConnectionContext } from './rpc/ConnectionContext';
import { LockStateContext } from './rpc/LockStateContext';
import { usePub, useSub } from './usePubSub';
import { useKeymapDraft } from './EdgeDraft';
import { unlockSaveBlocked, UNLOCK_SAVE_ERROR } from './edge-export/unlock-guard.js';
import { parseKeymap, planImport, readImportContext, snapshotKey } from './edge-export/keymap-import.js';
import type { Plan, Rpc } from './edge-export/keymap-import.js';
import { exportFiles, exportZip, exportLayout, describeBinding } from './edge-export/keymap-export.js';

export function KeymapImport() {
  const draft=useKeymapDraft();
  const { conn } = useContext(ConnectionContext);
  const lock = useContext(LockStateContext);
  const publish = usePub();
  const [lockingEnabled,setLockingEnabled]=useState<boolean>();
  useSub("edge.security.policy",setLockingEnabled);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const failedConnections = useRef(new WeakSet<object>());
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('Import an edited Edge .keymap without flashing.');
  const [preview,setPreview] = useState<{plan:Plan;backup:Keymap;filename:string}|null>(null);
  useEffect(()=>{setPreview(null);dialog.current?.close();},[conn]);
  const ready=!!conn && lock===LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED;
  const rpc:Rpc=async request=>{
    if(!conn || failedConnections.current.has(conn)) throw new Error('Keyboard disconnected. Reconnect before continuing.');
    let timer:ReturnType<typeof setTimeout>|undefined;
    try {
      const response=await Promise.race([call_rpc(conn,request),new Promise<never>((_,reject)=>{
        timer=setTimeout(()=>{
          failedConnections.current.add(conn);
          void publish('edge.import.abort',null);
          reject(new Error('Keyboard request timed out. Connection closed; reconnect and read the device before retrying.'));
        },request.keymap?.saveChanges ? 30000 : 5000);
      })]);
      if(response.meta) throw new Error('Keyboard refused the request. Verify it is connected and unlocked.');
      return response;
    } catch(error) {throw error instanceof Error?error:new Error(String(error));}
    finally {if(timer)clearTimeout(timer);}
  };
  async function load(file:File) {
    if(busy||!ready) return;
    setBusy(true);
    try {
      if(file.size>131072) throw new Error('Choose a .keymap smaller than 128 KiB.');
      const parsed=parseKeymap(await file.text());
      const context=await readImportContext(rpc);
      if(draft.base && snapshotKey(context.map)!==snapshotKey(draft.base)) throw new Error('The keyboard changed outside this draft. Discard/reload before importing.');
      if(!draft.map)draft.store.load(context.map);
      const current=draft.map||context.map;
      const plan=planImport(parsed,current,context.details);
      setPreview({plan,backup:current,filename:file.name});
      setMessage('Review the import before applying.');
      dialog.current?.showModal();
    } catch(error) { setMessage(error instanceof Error?error.message:'Could not read this keymap.'); }
    finally { setBusy(false); }
  }
  function backup() {
    if(!preview) return;
    const url=URL.createObjectURL(new Blob([exportZip(exportFiles(preview.backup))],{type:'application/zip'}));
    const link=document.createElement('a');link.href=url;link.download='lofree-edge-before-import.zip';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function apply() {
    if(!preview||!ready||busy) return;
    setBusy(true);
    try {
      if(!draft.map||snapshotKey(draft.map)!==preview.plan.beforeKey)throw new Error('The draft changed after preview. Reopen the file.');
      draft.store.replace({...preview.backup,layers:preview.plan.targets,availableLayers:preview.backup.layers.length+preview.backup.availableLayers-preview.plan.targets.length});
      setMessage('Imported into this browser draft. Press Save to apply it to the keyboard.');
      dialog.current?.close();setPreview(null);
    } catch(error) {setMessage(error instanceof Error?error.message:'Could not stage the import.');}
    finally {setBusy(false);}
  }

  const blocked=!!preview && unlockSaveBlocked({layers:preview.plan.targets},lockingEnabled);
  return <div className="p-2 flex flex-col gap-2 border-t border-base-300 max-w-64">
    <input ref={input} type="file" accept=".keymap" hidden onChange={event=>{
      const file=event.target.files?.[0];event.target.value='';if(file) void load(file);
    }}/>
    <button className="btn btn-sm" disabled={!ready||busy} onClick={()=>input.current?.click()}>{busy?'Reading/applying…':'Import edited .keymap ↑'}</button>
    <p className="text-xs" role="status">{message}</p>
    <dialog ref={dialog} className="modal" onCancel={event=>{if(busy)event.preventDefault();}}>
      <div className="modal-box max-w-xl">
        <h2 className="font-bold text-lg">Import into draft?</h2>
        {preview && <>
          <p className="py-2 break-words">{preview.filename}</p>
          <p>{preview.plan.changes.length} key changes · {preview.plan.add} layers added · {preview.plan.remove} removed · {preview.plan.renamed} renamed</p>
          <ul className="py-2">{preview.plan.targets.map((layer,index)=><li key={index}>Layer {index}: {layer.name}</li>)}</ul>
          <details className="py-2 text-sm"><summary>Review key assignments</summary><ul className="max-h-52 overflow-auto">
            {preview.plan.changes.map(change=><li key={`${change.layer}:${change.position}`} className="py-1">
              {preview.plan.targets[change.layer].name} · {exportLayout().layouts.LAYOUT.layout[change.position].label}: {describeBinding(preview.backup.layers[change.layer]?.bindings[change.position])} → {describeBinding(change.binding)}
            </li>)}
          </ul></details>
          <p className="text-sm">This updates the browser draft only. The keyboard changes when you press Save in the header.</p>
        </>}
        {blocked && <p role="alert" className="edge-inline-error">{UNLOCK_SAVE_ERROR}</p>}
        <p className="text-sm py-2" role="status">{busy?message:'Download a backup first if you want to restore your current setup later.'}</p>
        <div className="modal-action flex-wrap">
          <button className="btn btn-sm" disabled={busy} onClick={backup}>Download current backup ↓</button>
          <button className="btn btn-sm" disabled={busy} onClick={()=>dialog.current?.close()}>Cancel</button>
          <button className="btn btn-sm btn-primary" disabled={busy||!ready||blocked} onClick={()=>void apply()}>Use as draft</button>
        </div>
      </div>
    </dialog>
  </div>;
}
