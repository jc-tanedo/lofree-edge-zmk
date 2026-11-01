import { KEY_SYMBOLS, KEY_ALIASES } from './keymap-export-symbols.js';
import { behaviorId } from './keymap-export.js';

const actions = {
  kp:['key_press',1], mo:['momentary_layer',1], tog:['toggle_layer',1], to:['to_layer',1],
  trans:['transparent',0], none:['none',0], bl:['bcklight',2], studio_unlock:['studio_unlock',0],
  prev_fw:['prev_firmware',0], edge_stock_return:['prev_firmware',0],
  sys_reset:['sysreset',0], bootloader:['bootload',0], bt:['bluetooth',2], out:['outputs',1],
};
const bluetooth = {BT_CLR:[0,0],BT_NXT:[1,0],BT_PRV:[2,0],BT_CLR_ALL:[4,0]};
const controls = {BT_CLR_CMD:0,BT_NXT_CMD:1,BT_PRV_CMD:2,BT_SEL_CMD:3,BT_SEL:3,BT_CLR_ALL_CMD:4,BT_DISC_CMD:5,BT_DISC:5,OUT_TOG:0,OUT_USB:1,OUT_BLE:2,OUT_NONE:3};
const modifiers = Object.fromEntries(['LC','LS','LA','LG','RC','RS','RA','RG'].map((name,index)=>[name,index]));
const keyValues = Object.fromEntries(Object.entries(KEY_SYMBOLS).map(([value,name])=>[name,Number(value)]));
const backlight = { BL_ON: [0,0], BL_OFF:[1,0], BL_TOG:[2,0], BL_INC:[3,0], BL_DEC:[4,0], BL_CYCLE:[5,0] };

function tokens(source) {
  const result=[];
  for(let index=0;index<source.length;) {
    const rest=source.slice(index);
    const ignored=rest.match(/^(?:\s+|\/\/[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)/);
    if(ignored) { index+=ignored[0].length; continue; }
    const match=rest.match(/^(?:"(?:\\.|[^"\\])*"|0x[\da-fA-F]+|\d+|[A-Za-z_#][\w,.-]*|<<|>>|[{};:<>()=&/,|+\-])/);
    if(!match) throw new Error(`Unsupported source near ${JSON.stringify(rest.slice(0,32))}.`);
    result.push(match[0]); index+=match[0].length;
    if(result.length>15000) throw new Error('Keymap source is too complex.');
  }
  return result;
}

function numberExpr(input, defines, stack=[]) {
  let position=0;
  function atom() {
    const token=input[position++];
    if(token==='(') { const value=expression(0); if(input[position++]!==')') throw new Error('Unclosed key expression.'); return value; }
    if(token && /^(?:0x[\da-f]+|\d+)$/i.test(token)) return Number(token);
    if(!token || !/^[A-Za-z_]\w*$/.test(token)) throw new Error(`Expected a keycode or number, got ${token ?? 'end of source'}.`);
    if(input[position]==='(') {
      if(!(token in modifiers)) throw new Error(`Unsupported macro ${token}(). Only compiled modifier expressions are supported.`);
      position++; const value=expression(0);
      if(input[position++]!==')') throw new Error('Unclosed modifier expression.');
      return (value | ((1<<modifiers[token])<<24))>>>0;
    }
    if(defines.has(token)) {
      if(stack.includes(token)||stack.length>=24) throw new Error(`Circular or overly nested definition ${token}.`);
      return numberExpr(defines.get(token),defines,[...stack,token]);
    }
    if(token in controls) return controls[token];
    if(token in keyValues) return keyValues[token];
    if(token in KEY_ALIASES) {
      if(stack.includes(token)||stack.length>=24) throw new Error(`Circular definition ${token}.`);
      return numberExpr(tokens(KEY_ALIASES[token]),defines,[...stack,token]);
    }
    if(token==='BL_SET') return 6;
    throw new Error(`Unknown keycode or constant ${token}.`);
  }
  const priority={'|':1,'<<':2,'>>':2,'+':3,'-':3};
  function expression(minimum) {
    let left=atom();
    while(priority[input[position]]>=minimum) {
      const operator=input[position++], right=expression(priority[operator]+1);
      if(operator==='|') left=(left|right)>>>0;
      if(operator==='<<'||operator==='>>') { if(right>31) throw new Error('Invalid bit shift.'); left=(operator==='<<'?left<<right:left>>>right)>>>0; }
      if(operator==='+') left+=right;
      if(operator==='-') left-=right;
    }
    return left;
  }
  const value=expression(0);
  if(position!==input.length || !Number.isInteger(value)||value<0||value>0xffffffff) throw new Error('Invalid or unsupported key expression.');
  return value;
}

function tree(input) {
  let index=0;
  function node(name,label) {
    if(input[index++]!=='{') throw new Error('Expected a devicetree node.');
    const result={name,label,props:{},children:[]};
    while(input[index]!=='}') {
      if(index>=input.length) throw new Error('Unclosed devicetree node.');
      let child=input[index++], childLabel;
      if(input[index]===':') { childLabel=child; index++; child=input[index++]; }
      if(input[index]==='{') { result.children.push(node(child,childLabel)); if(input[index++]!==';') throw new Error('Expected a node terminator.'); }
      else {
        if(childLabel) throw new Error('Property labels are unsupported.');
        if(Object.hasOwn(result.props,child)) throw new Error(`Duplicate property ${child}.`);
        const value=[];
        if(input[index]==='=') { index++; while(input[index]!==';') { if(index>=input.length||['{','}'].includes(input[index])) throw new Error(`Malformed property ${child}.`); value.push(input[index++]); } }
        if(input[index++]!==';') throw new Error('Expected a property terminator.');
        result.props[child]=value;
      }
    }
    index++;
    return result;
  }
  if(input[index++]!=='/') throw new Error('Expected a / { ... } devicetree source.');
  const root=node('/');
  if(input[index++]!==';'||index!==input.length) throw new Error('Only one root devicetree block is supported.');
  return root;
}

function stringProp(node,key,fallback) {
  const value=node.props[key];
  if(!value) return fallback;
  if(value.length!==1 || !value[0].startsWith('"')) throw new Error(`Expected a string for ${key}.`);
  return JSON.parse(value[0]);
}
function onlyProps(node,allowed) {
  for(const name of Object.keys(node.props)) if(!allowed.includes(name)) throw new Error(`Unsupported property ${name} on ${node.name}.`);
}

export function parseKeymap(source) {
  if(typeof source!=='string'||source.length>131072) throw new Error('Choose a .keymap file smaller than 128 KiB.');
  source=source.replace(/^\uFEFF/,'').replace(/\\\r?\n/g,'');
  source=source.replace(/("(?:\\.|[^"\\])*")|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,(match,string)=>string??match.replace(/[^\n]/g,' '));
  const defines=new Map(), lines=[];
  // No C preprocessor or JavaScript execution. Only bounded object constants.
  for(const line of source.split('\n')) {
    if(!line.trimStart().startsWith('#') || /^\s*#binding-cells\b/.test(line)) { lines.push(line); continue; }
    if(/^\s*#include\s*<(?:behaviors\.dtsi|dt-bindings\/zmk\/(?:keys|backlight|behaviors|bt|outputs)\.h)>\s*(?:\/\/.*)?$/.test(line)) continue;
    const match=line.match(/^\s*#define\s+([A-Za-z_]\w*)(?:\s+(.*))?$/);
    if(!match) throw new Error('Unsupported preprocessor directive. Conditional includes and function macros require a firmware build.');
    if(/^ZMK_BEHAVIORS_KEEP_(?:NONE|TOG|TO|BT|OUT)$/.test(match[1]) && !match[2]) continue;
    if(!match[2] || defines.has(match[1])) throw new Error(`Invalid or duplicate definition ${match[1]}.`);
    defines.set(match[1],tokens(match[2]));
  }
  const root=tree(tokens(lines.join('\n')));
  onlyProps(root,[]);
  if(root.children.some(node=>!['keymap','behaviors'].includes(node.name))) throw new Error('Combos, macros, hardware and conditional-layer definitions cannot be imported into this firmware.');
  const maps=root.children.filter(node=>node.name==='keymap');
  if(maps.length!==1) throw new Error('Expected exactly one keymap node.');
  const map=maps[0], aliases={...actions};
  onlyProps(map,['compatible']);
  if(stringProp(map,'compatible')!=='zmk,keymap') throw new Error('Expected compatible = "zmk,keymap".');
  for(const parent of root.children.filter(node=>node.name==='behaviors')) {
    onlyProps(parent,[]);
    for(const child of parent.children) {
    onlyProps(child,['compatible','#binding-cells','hold-ms','display-name']);
    if(child.children.length||stringProp(child,'compatible')!=='zmk,behavior-prev-firmware'||!child.label) throw new Error('New or modified behavior definitions require a firmware build.');
    const numberProperty=key=>numberExpr((child.props[key]??[]).filter(token=>!['<','>'].includes(token)),defines);
    if(numberProperty('#binding-cells')!==0||numberProperty('hold-ms')!==3000) throw new Error('The compiled stock-return action requires zero parameters and a 3000 ms hold.');
    if(child.label in aliases && aliases[child.label][0]!=='prev_firmware') throw new Error('A custom behavior cannot replace a standard action.');
    aliases[child.label]=['prev_firmware',0];
    }
  }
  if(map.children.length<1||map.children.length>3) throw new Error('This firmware supports three total layers.');
  const layers=map.children.map((layer,sourceIndex)=>{
    onlyProps(layer,['bindings','display-name','label','status']);
    if(layer.children.length) throw new Error('Nested layer definitions are unsupported.');
    const status=stringProp(layer,'status','okay');
    if(!['okay','reserved','disabled'].includes(status)) throw new Error('Unsupported layer status.');
    const name=stringProp(layer,'display-name',stringProp(layer,'label',layer.name));
    const raw=layer.props.bindings;
    if(!raw) throw new Error(`Missing bindings for ${name}.`);
    const values=raw.filter(token=>!['<','>',','].includes(token)), bindings=[];
    for(let index=0;index<values.length;) {
      if(values[index++]!=='&') throw new Error(`Expected a behavior binding in layer ${name}.`);
      const label=values[index++], definition=aliases[label];
      if(!definition) throw new Error(`Unsupported action &${label}. It is not compiled into the Edge firmware.`);
      const args=[];
      while(index<values.length && values[index]!=='&') {
        const expression=[];
        if(values[index]==='(') {
          let depth=0;
          do { const token=values[index++]; expression.push(token); if(token==='(')depth++; if(token===')')depth--; if(index>values.length)throw new Error('Unclosed expression.'); }while(depth);
        } else {
          expression.push(values[index++]);
          if(values[index]==='(') { let depth=0; do { const token=values[index++];expression.push(token); if(token==='(')depth++;if(token===')')depth--;if(index>values.length)throw new Error('Unclosed modifier.'); }while(depth); }
        }
        if(definition[0]==='bcklight' && expression.length===1 && expression[0] in backlight) args.push(...backlight[expression[0]]);
        else if(definition[0]==='bluetooth' && expression.length===1 && expression[0] in bluetooth) args.push(...bluetooth[expression[0]]);
        else args.push(numberExpr(expression,defines));
      }
      if(args.length!==definition[1]) throw new Error(`&${label} expects ${definition[1]} parameters, received ${args.length}.`);
      bindings.push({action:definition[0],param1:args[0]??0,param2:args[1]??0});
    }
    if(bindings.length!==84) throw new Error(`Layer ${name} has ${bindings.length} bindings; the Edge requires 84.`);
    if(status!=='okay' && bindings.some(binding=>binding.action!=='transparent'||binding.param1!==0||binding.param2!==0)) throw new Error(`Layer ${name} is ${status} but contains mappings. Enable it by removing its status property before importing.`);
    return {name,sourceIndex,enabled:status==='okay',bindings};
  });
  if(!layers.some(layer=>layer.enabled)) throw new Error('At least one layer must be enabled.');
  for(const layer of layers) for(const binding of layer.bindings) if(['momentary_layer','toggle_layer','to_layer'].includes(binding.action) && !layers[binding.param1]?.enabled) throw new Error('A layer action targets a missing or reserved layer. Enable that layer before importing.');
  return {layers};
}

export function snapshotKey(map) {
  return JSON.stringify(map.layers.map(layer=>[layer.id,layer.name,layer.bindings.map(binding=>[binding.behaviorId,binding.param1??0,binding.param2??0])]));
}

function validParameter(value,choices,layerIds) {
  if(!choices?.length) return value===0;
  return choices.some(choice=>{
    if(choice.constant!==undefined) return value===choice.constant;
    if(choice.range) return value>=choice.range.min && value<=choice.range.max;
    if(choice.layerId) return layerIds.includes(value);
    if(choice.nil) return value===0;
    if(choice.hidUsage) {
      const page=(value>>>16)&255, usage=value&65535;
      return usage>0 && ((page===7&&usage<=choice.hidUsage.keyboardMax)||(page===12&&usage<=choice.hidUsage.consumerMax));
    }
    return false;
  });
}

export function planImport(parsed,current,details) {
  if(!current?.layers?.length || current.layers.length+(current.availableLayers??0)!==3 || current.layers.some(layer=>layer.bindings.length!==84)) throw new Error('Unexpected Edge keymap capacity.');
  const enabled=parsed.layers.filter(layer=>layer.enabled), ids=current.layers.map(layer=>layer.id);
  if(new Set(ids).size!==ids.length || ids.some(id=>!Number.isInteger(id)||id<0||id>2)) throw new Error('Unexpected device layer IDs.');
  const targetIds=[...ids.slice(0,enabled.length)];
  for(const id of [0,1,2]) if(targetIds.length<enabled.length && !ids.includes(id)) targetIds.push(id);
  if(targetIds.length!==enabled.length) throw new Error('No spare layer is available.');
  const sourceIds=new Map(enabled.map((layer,index)=>[layer.sourceIndex,targetIds[index]]));
  const targets=enabled.map((layer,index)=>{
    if(new TextEncoder().encode(layer.name).length>=(current.maxLayerNameLength??20)) throw new Error('A layer name exceeds the firmware limit.');
    const bindings=layer.bindings.map(binding=>{
      let id=behaviorId(binding.action);
      if(binding.action==='prev_firmware' && !details.has(id)) id=behaviorId('edge_stock_return');
      const meta=details.get(id);
      if(!meta) throw new Error(`The connected keyboard does not provide ${binding.action}.`);
      let param1=binding.param1;
      if(['momentary_layer','toggle_layer','to_layer'].includes(binding.action)) param1=sourceIds.get(param1);
      const result={behaviorId:id,param1,param2:binding.param2};
      const sets=meta.metadata??[];
      if(sets.length ? !sets.some(set=>validParameter(result.param1,set.param1,targetIds)&&validParameter(result.param2,set.param2,targetIds)) : result.param1!==0||result.param2!==0) throw new Error(`Invalid parameters for ${meta.displayName??binding.action}.`);
      return result;
    });
    return {id:targetIds[index],name:layer.name,bindings};
  });
  const changes=[];
  targets.forEach((target,index)=>target.bindings.forEach((binding,position)=>{
    const before=current.layers[index]?.bindings[position];
    if(!before || JSON.stringify([before.behaviorId,before.param1??0,before.param2??0])!==JSON.stringify([binding.behaviorId,binding.param1,binding.param2])) changes.push({layer:index,position,binding});
  }));
  return {beforeKey:snapshotKey(current),targets,changes,add:Math.max(0,targets.length-current.layers.length),remove:Math.max(0,current.layers.length-targets.length),renamed:targets.filter((layer,index)=>layer.name!==current.layers[index]?.name).length};
}

export async function readImportContext(rpc) {
  const identity=await rpc({core:{getDeviceInfo:true}});
  if(identity.core?.getDeviceInfo?.name!=='Lofree Edge ZMK') throw new Error('Connect the supported Lofree Edge firmware.');
  const unsaved=await rpc({keymap:{checkUnsavedChanges:true}});
  if(typeof unsaved.keymap?.checkUnsavedChanges!=='boolean') throw new Error('Could not check unsaved changes.');
  if(unsaved.keymap.checkUnsavedChanges) throw new Error('Save or discard your existing Studio edits before importing.');
  const map=(await rpc({keymap:{getKeymap:true}})).keymap?.getKeymap;
  if(!map) throw new Error('Unlock the keyboard before importing.');
  const ids=(await rpc({behaviors:{listAllBehaviors:true}})).behaviors?.listAllBehaviors?.behaviors;
  if(!ids) throw new Error('Could not read supported actions.');
  const details=new Map();
  for(const id of ids) {
    const detail=(await rpc({behaviors:{getBehaviorDetails:{behaviorId:id}}})).behaviors?.getBehaviorDetails;
    if(!detail || detail.id!==id) throw new Error('Could not verify a keyboard action.');
    details.set(id,detail);
  }
  return {map,details};
}

export async function applyImport(rpc,plan,progress=()=>{}) {
  const context=await readImportContext(rpc);
  if(snapshotKey(context.map)!==plan.beforeKey) throw new Error('The keyboard changed after preview. Load the file again to review fresh changes.');
  if(!plan.changes.length && !plan.add && !plan.remove && !plan.renamed) return context.map;
  let saving=false, started=false;
  try {
    for(let index=context.map.layers.length;index<plan.targets.length;index++) {
      started=true;
      const added=(await rpc({keymap:{addLayer:{}}})).keymap?.addLayer?.ok;
      if(added?.layer?.id!==plan.targets[index].id) throw new Error('Could not allocate the expected layer.');
    }
    for(let index=0;index<plan.targets.length;index++) {
      const target=plan.targets[index];
      if(context.map.layers[index]?.name!==target.name) {
        started=true;
        if((await rpc({keymap:{setLayerProps:{layerId:target.id,name:target.name}}})).keymap?.setLayerProps!==0) throw new Error('Layer rename was refused.');
      }
    }
    for(const [index,change] of plan.changes.entries()) {
      started=true;
      if((await rpc({keymap:{setLayerBinding:{layerId:plan.targets[change.layer].id,keyPosition:change.position,binding:change.binding}}})).keymap?.setLayerBinding!==0) throw new Error('A key assignment was refused.');
      progress(index+1,plan.changes.length);
    }
    for(let index=context.map.layers.length-1;index>=plan.targets.length;index--) {
      started=true;
      if(!(await rpc({keymap:{removeLayer:{layerIndex:index}}})).keymap?.removeLayer?.ok) throw new Error('Layer removal was refused.');
    }
    let actual=(await rpc({keymap:{getKeymap:true}})).keymap?.getKeymap;
    if(!actual||snapshotKey(actual)!==snapshotKey({layers:plan.targets})) throw new Error('Keymap readback differs from the import.');
    saving=true;
    if(!(await rpc({keymap:{saveChanges:true}})).keymap?.saveChanges?.ok) throw new Error('The keyboard could not save the imported keymap.');
    actual=(await rpc({keymap:{getKeymap:true}})).keymap?.getKeymap;
    if(!actual||snapshotKey(actual)!==snapshotKey({layers:plan.targets})) throw new Error('Final keymap readback failed.');
    return actual;
  } catch(error) {
    if(saving) throw new Error(`${error.message} Saving may be partial. Reconnect and read the device; use your downloaded backup if needed.`);
    if(started) {
      try {
        if(!(await rpc({keymap:{discardChanges:true}})).keymap?.discardChanges) throw new Error('Discard failed');
        let restored=(await rpc({keymap:{getKeymap:true}})).keymap?.getKeymap;
        if(!restored) throw new Error('Restore readback missing');
        // This ZMK revision reloads binding/order settings on discard but does
        // not reset names lacking a saved setting. Restore only those RAM names,
        // discard again to clear pending flags, then verify the complete map.
        const normalized={layers:restored.layers.map((layer,index)=>({...layer,name:context.map.layers[index]?.name}))};
        if(snapshotKey(normalized)!==plan.beforeKey) throw new Error('Bindings or order did not restore');
        let namesChanged=false;
        for(let index=0;index<restored.layers.length;index++) if(restored.layers[index].name!==context.map.layers[index].name) {
          if((await rpc({keymap:{setLayerProps:{layerId:restored.layers[index].id,name:context.map.layers[index].name}}})).keymap?.setLayerProps!==0) throw new Error('Name restore refused');
          namesChanged=true;
        }
        if(namesChanged) {
          if(!(await rpc({keymap:{discardChanges:true}})).keymap?.discardChanges) throw new Error('Could not clear pending name edits');
          restored=(await rpc({keymap:{getKeymap:true}})).keymap?.getKeymap;
        }
        if(!restored||snapshotKey(restored)!==plan.beforeKey) throw new Error('Restore readback differs');
      } catch { throw new Error(`${error.message} Could not verify restoration. Reconnect and use your downloaded backup.`); }
      throw new Error(`${error.message} The previously saved keymap was restored; nothing was saved.`);
    }
    throw error;
  }
}
