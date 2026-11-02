import test from 'node:test';
import assert from 'node:assert/strict';
import { IDS } from '../dist/studio-actions.js';
import { hasUnlockBinding, unlockSaveBlocked, assertUnlockSaveAllowed } from '../dist/unlock-guard.js';
const map = (...ids) => ({layers:ids.map(behaviorId=>({bindings:[{behaviorId}]}))});
test('missing unlock blocks enabled and unknown policies; disabled permits it',()=>{
  const absent=map(IDS.none), present=map(IDS.none,IDS.studio_unlock);
  assert.equal(hasUnlockBinding(present),true);
  for(const policy of [true,undefined]) assert.equal(unlockSaveBlocked(absent,policy),true);
  assert.equal(unlockSaveBlocked(absent,false),false);
  assert.equal(unlockSaveBlocked(present,true),false);
});
test('save guard reads actual device mapping, rejects protected missing binding before persistence',async()=>{
  const requests=[];
  const rpc=async r=>{requests.push(r);return {keymap:{getKeymap:map(IDS.none)}};};
  await assert.rejects(assertUnlockSaveAllowed(rpc,async()=>true),/Saving is blocked/);
  assert.deepEqual(requests,[{keymap:{getKeymap:true}}]);
  await assertUnlockSaveAllowed(rpc,async()=>false);
});
test('restoring unlock in any layer permits saving and needs no policy read',async()=>{
  await assertUnlockSaveAllowed(async()=>({keymap:{getKeymap:map(IDS.none,IDS.studio_unlock)}}),async()=>{throw Error('not needed');});
});
test('import target is checked before mutation; invalid or unavailable policy fails closed',async()=>{
  const rpc=async()=>{throw Error('target preflight must not mutate/read map');};
  await assert.rejects(assertUnlockSaveAllowed(rpc,async()=>true,map(IDS.none)),/Saving is blocked/);
  await assertUnlockSaveAllowed(rpc,async()=>false,map(IDS.none));
  await assert.rejects(assertUnlockSaveAllowed(rpc,async()=>{throw Error('unsupported');},map(IDS.none)),/Could not verify/);
  await assert.rejects(assertUnlockSaveAllowed(async()=>({}),async()=>false),/current keymap/);
});
