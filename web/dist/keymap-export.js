import { KEY_LAYOUT } from './layout.js';
import { KEY_SYMBOLS } from './keymap-export-symbols.js';

const keys = [...KEY_LAYOUT].sort((a, b) => a.slot - b.slot);
const definitions = [
  ['key_press','kp',1], ['momentary_layer','mo',1], ['toggle_layer','tog',1],
  ['to_layer','to',1], ['transparent','trans',0], ['none','none',0],
  ['bcklight','bl',2], ['studio_unlock','studio_unlock',0],
  ['prev_firmware','edge_stock_return',0], ['sysreset','sys_reset',0], ['bootload','bootloader',0],
  ['edge_stock_return','edge_stock_return',0], ['bluetooth','bt',2], ['outputs','out',1],
];
export function behaviorId(name) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(name)) {
    crc ^= byte;
    for (let bit=0; bit<8; bit++) crc=(crc>>>1)^(crc&1?0xa001:0);
  }
  return crc;
}
const behaviors = new Map(definitions.map(([name,label,cells]) => [behaviorId(name), { label, cells }]));

export function exportLayout() {
  return { name: 'Lofree Edge', keyboard_name: 'Lofree Edge', layouts: { LAYOUT: { layout: keys.map(key => ({
    label: key.label, x: Math.round(key.x*100/26)/100, y: Math.round(key.y*100/26)/100,
    w: Math.round(key.width*100/26)/100, h: Math.round(key.height*100/26)/100,
    // Text-format rows must be sequential in binding order. x/y remain visual.
    row: Math.floor(key.slot/15), col: keys.filter(other=>Math.floor(other.slot/15)===Math.floor(key.slot/15) && other.slot<key.slot).length,
  })) } } };
}

function keyCode(value) {
  const base = value & 0xffffff;
  let code = KEY_SYMBOLS[String(base)] ?? `0x${base.toString(16)}`;
  const modifiers = ['LC','LS','LA','LG','RC','RS','RA','RG'];
  modifiers.forEach((modifier,bit) => { if ((value>>>24)&(1<<bit)) code=`${modifier}(${code})`; });
  return code;
}

export function describeBinding(binding) {
  if(!binding) return 'New layer';
  const definition=behaviors.get(binding.behaviorId);
  if(!definition) return 'Unknown action';
  let text='&'+definition.label;
  if(definition.cells) text+=' '+(definition.label==='kp'?keyCode(binding.param1??0):(binding.param1??0));
  if(definition.cells===2) text+=' '+(binding.param2??0);
  return text;
}

export function exportKeymap(map) {
  if (!map || !Array.isArray(map.layers) || !map.layers.length || map.layers.length>3) throw new Error('Expected an Edge keymap with one to three layers.');
  const ids = map.layers.map(layer=>layer.id);
  if (new Set(ids).size!==ids.length || ids.some(id=>!Number.isInteger(id)||id<0||id>2)) throw new Error('Unrecognized Edge layer IDs.');
  const order = [...ids, ...[0,1,2].filter(id=>!ids.includes(id))];
  const layerIndex = new Map(order.map((id,index)=>[id,index]));
  const lines = ['/* Exported from the keyboard through ZMK Studio. */',
    '#define ZMK_BEHAVIORS_KEEP_NONE', '#define ZMK_BEHAVIORS_KEEP_TOG', '#define ZMK_BEHAVIORS_KEEP_TO',
    '#include <behaviors.dtsi>', '#include <dt-bindings/zmk/bt.h>', '#include <dt-bindings/zmk/outputs.h>', '#include <dt-bindings/zmk/keys.h>', '#include <dt-bindings/zmk/backlight.h>',
    '/ {', '  behaviors {', '    edge_stock_return: edge_stock_return {',
    '      compatible = "zmk,behavior-prev-firmware";', '      #binding-cells = <0>;', '      hold-ms = <3000>;',
    '      display-name = "Return to stock (hold 3s)";', '    };', '  };', '  keymap {', '    compatible = "zmk,keymap";'];
  for (const [index,id] of order.entries()) {
    const layer = map.layers.find(entry=>entry.id===id);
    if (layer && layer.bindings.length!==84) throw new Error('Each Edge layer must contain exactly 84 bindings.');
    lines.push(`    layer_${index} {`, `      display-name = ${JSON.stringify(layer?.name ?? 'Spare')};`);
    if (!layer) lines.push('      status = "reserved";');
    lines.push('      bindings = <');
    for (let position=0; position<84; position++) {
      let text = '&trans';
      if (layer) {
        const binding = layer.bindings[position];
        const definition = behaviors.get(binding.behaviorId);
        if (!definition) throw new Error(`Unknown behavior ${binding.behaviorId} at layer ${id}, key ${position}. Export stopped to avoid losing an action.`);
        const p1=binding.param1 ?? 0, p2=binding.param2 ?? 0;
        if (!Number.isInteger(p1)||p1<0||p1>0xffffffff||!Number.isInteger(p2)||p2<0||p2>0xffffffff||(definition.cells<2 && p2!==0)||(!definition.cells && p1!==0)) throw new Error('Unsupported binding parameters; export stopped.');
        text = `&${definition.label}`;
        if (definition.cells) {
          let value = p1;
          if (['mo','tog','to'].includes(definition.label)) {
            if (!layerIndex.has(p1)) throw new Error('Binding points to an unknown layer.');
            value=layerIndex.get(p1);
          }
          text += ' ' + (definition.label==='kp' ? keyCode(p1) : value);
          if (definition.cells===2) text += ' ' + p2;
        }
      }
      lines.push(`        ${text} /* ${keys[position].label} */`);
    }
    lines.push('      >;', '    };');
  }
  lines.push('  };', '};', '');
  return lines.join('\n');
}

export function exportFiles(map) {
  return {
    'info.json': JSON.stringify(exportLayout(),null,2)+'\n',
    'lofree_edge.keymap': exportKeymap(map),
    'README.txt': 'Lofree Edge / Nick Coutsos Keymap Editor export\n\nImport info.json as the layout and lofree_edge.keymap as the device source tree.\nThe 84 entries are in ZMK transform order, including the irregular bottom row.\nLayer targets are translated from device layer IDs to source indices.\nUnused layers are reserved, retaining the three-layer capacity.\nThe stock-return behavior is custom to this Edge firmware and is defined in the source.\n\nThis is a fresh snapshot of the keyboard working keymap, including unsaved Studio edits.\nTo apply edited files, use Import edited .keymap in local Studio, review the preview,\nand choose Apply and save. Only the three compiled layers and supported actions are\naccepted. This uses Studio RPC; no firmware rebuild/flash is required. Saved Studio\nsettings can override compiled defaults; exporting itself does not change the device.\n',
  };
}

// Standard uncompressed ZIP; one download avoids multiple-download permissions.
export function exportZip(files) {
  const enc=new TextEncoder(), chunks=[], directory=[];
  let offset=0;
  const crc32 = bytes => {
    let crc=0xffffffff;
    for(const byte of bytes) { crc^=byte; for(let n=0;n<8;n++) crc=(crc>>>1)^(crc&1?0xedb88320:0); }
    return (crc^0xffffffff)>>>0;
  };
  for(const [name,text] of Object.entries(files)) {
    const filename=enc.encode(name), bytes=enc.encode(text), crc=crc32(bytes);
    const header=new Uint8Array(30+filename.length), h=new DataView(header.buffer);
    h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true);
    h.setUint16(12,0x21,true); // DOS date1980-01-01, valid across ZIP readers.
    h.setUint32(14,crc,true); h.setUint32(18,bytes.length,true); h.setUint32(22,bytes.length,true);
    h.setUint16(26,filename.length,true); header.set(filename,30);
    const central=new Uint8Array(46+filename.length), c=new DataView(central.buffer);
    c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true);
    c.setUint16(14,0x21,true);
    c.setUint32(16,crc,true); c.setUint32(20,bytes.length,true); c.setUint32(24,bytes.length,true);
    c.setUint16(28,filename.length,true); c.setUint32(42,offset,true); central.set(filename,46);
    chunks.push(header,bytes); directory.push(central); offset+=header.length+bytes.length;
  }
  const size=directory.reduce((n,bytes)=>n+bytes.length,0), end=new Uint8Array(22), e=new DataView(end.buffer);
  e.setUint32(0,0x06054b50,true); e.setUint16(8,directory.length,true); e.setUint16(10,directory.length,true);
  e.setUint32(12,size,true); e.setUint32(16,offset,true);
  const result=new Uint8Array(offset+size+22); let cursor=0;
  for(const bytes of [...chunks,...directory,end]) { result.set(bytes,cursor); cursor+=bytes.length; }
  return result;
}
