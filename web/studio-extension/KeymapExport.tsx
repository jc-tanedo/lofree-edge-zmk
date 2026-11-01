import { useContext, useState } from 'react';
import { call_rpc } from '@zmkfirmware/zmk-studio-ts-client';
import { ConnectionContext } from './rpc/ConnectionContext';
import { LockStateContext } from './rpc/LockStateContext';
import { LockState } from '@zmkfirmware/zmk-studio-ts-client/core';
import { exportFiles, exportZip } from './edge-export/keymap-export.js';

export function KeymapExport() {
  const { conn } = useContext(ConnectionContext);
  const lock = useContext(LockStateContext);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Export the current keyboard mappings with info.json.');
  async function download() {
    if (!conn || busy) return;
    setBusy(true);
    try {
      // Fresh RPC read, not the editor's cached React state. Never mutate/save.
      const identity = await call_rpc(conn, { core: { getDeviceInfo: true } });
      if (identity.core?.getDeviceInfo?.name !== 'Lofree Edge ZMK') throw new Error('This export supports the Lofree Edge firmware only.');
      const response = await call_rpc(conn, { keymap: { getKeymap: true } });
      if (!response.keymap?.getKeymap) throw new Error('Unlock the keyboard, then try exporting again.');
      const files = exportFiles(response.keymap.getKeymap);
      const zip = exportZip(files);
      const url = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lofree-edge-keymap-editor.zip';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Exported info.json and lofree_edge.keymap. Use Import edited .keymap to apply external edits.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Export failed.'); }
    finally { setBusy(false); }
  }
  return <div className="p-2 flex flex-col gap-2 border-t border-base-300 max-w-64">
    <button className="btn btn-sm" disabled={!conn || busy || lock !== LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED} onClick={download}>
      {busy ? 'Reading keyboard…' : 'Export for Keymap Editor ↓'}
    </button>
    <p className="text-xs" role="status">{message}</p>
  </div>;
}
