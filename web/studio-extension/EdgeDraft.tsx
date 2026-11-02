// SPDX-License-Identifier: GPL-3.0-or-later
import {createContext,useContext,useState,useEffect,useSyncExternalStore,type ReactNode} from 'react';
import {KeymapDraft} from './edge-export/keymap-draft.js';
const Context=createContext<KeymapDraft|null>(null);
export function EdgeDraftProvider({children}:{children:ReactNode}) {
 const [store]=useState(()=>new KeymapDraft());useEffect(()=>{const leave=()=>store.discard();window.addEventListener('pagehide',leave);return()=>window.removeEventListener('pagehide',leave);},[store]);return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useKeymapDraft(){const store=useContext(Context);if(!store)throw Error('Draft provider missing');return {store,...useSyncExternalStore(store.subscribe,store.getSnapshot)};}
