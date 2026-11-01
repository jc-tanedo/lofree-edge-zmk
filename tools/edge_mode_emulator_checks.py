# SPDX-License-Identifier: GPL-3.0-or-later
"""Additional compiled-selector checks, after the secure BLE regression."""
import json
import re

def run(s):
    m, u, advance = s['m'], s['u'], s['advance']
    te, radio, pressed = s['te'], s['radio'], s['pressed']
    root, studio = s['ROOT'], s['state']
    pads = m.pad_levels
    level = [0xc0]
    def selector(port):
        value, floating = pads(port)
        return ((value & 0x1f) | level[0], floating & 0x1f) if port == 3 else (value, floating)
    m.pad_levels = selector
    snapshots = [s['stack_snapshot']()]
    def move(value):
        level[0] = value
        snapshots.append(s['stack_snapshot']())
        try:
            advance(1200)
        except te.SoftwareReset:
            m.reset()
        else:
            raise AssertionError('No guarded mode restart')
        assert m.boot_slot == 0x20000, 'Accepted image unexpectedly rolled back'
        advance(400)
        snapshots.append(s['stack_snapshot']())
    def quiet():
        count = len(radio.cmds)
        advance(150)
        assert len(radio.cmds) == count, 'Radio active in ON/OFF'
    def connect_studio():
        assert u.dp_pullup(), 'ON did not enable USB'
        u.bus_reset()
        u.control(bytes([0,5,1,0,0,0,0,0]))
        u.control(bytes([0,9,1,0,0,0,0,0]))
        studio['activate_serial']()
        studio['unlock']()
    pressed.add((3,1)); advance(100)
    release_start = len(s['central'].ntf)
    move(0xa0)
    assert any(h == 20 and not any(bytes.fromhex(p))
               for _,h,p in s['central'].ntf[release_start:]), 'Missing old-link all-up before restart'
    s['central'].go_silent(0)
    pressed.clear()
    assert not u.dp_pullup(), 'OFF enumerated USB'
    assert not m.regs_mem[0x780] & 0x10, 'OFF enabled backlight'
    assert not m.regs_mem[0x583] & 0x80 and m.regs_mem[0x593] & 2, 'OFF enabled Caps gates'
    quiet()
    pressed.update({(5,10),(0,0),(3,1)})
    advance(150)
    pressed.clear()
    assert not u.dp_pullup() and not m.regs_mem[0x780] & 0x10
    print('PASS: BT-to-OFF restart suppresses USB, radio, lighting and matrix actions')
    move(0xe0)
    connect_studio()
    quiet()
    reloaded = studio['keymap']()
    assert reloaded.layers[2].name == 'Custom'
    assert reloaded.layers[0].bindings[45] == reloaded.layers[0].bindings[79]
    print('PASS: OFF-to-ON restores Studio and saved map/layers without Bluetooth fallback')
    # Brief contact excursions cannot satisfy two separate 50ms observations.
    count = m.reset_count
    level[0] = 0xa0; advance(10)
    level[0] = 0xe0; advance(130)
    assert m.reset_count == count and u.dp_pullup(), 'Short bounce restarted the controller'
    # Exercise all four legacy output actions through real RPC bindings and
    # physical matrix presses; preserve their IDs while making them inert.
    output_id = next(i for i,d in studio['behavior_details'].items()
                     if d.display_name.startswith('Output Selection'))
    layout = json.loads(re.search(r'KEY_LAYOUT = (\[.*?\]);',
                         (root/'web/dist/layout.js').read_text()).group(1))
    for digit, action in zip(('4','5','6','7'), (2,1,3,0)):
        request = studio['pb'].Request()
        target = request.keymap.set_layer_binding
        target.layer_id = 1
        target.key_position = next(k['slot'] for k in layout if k['label'] == digit)
        target.binding.behavior_id = output_id
        target.binding.param1 = action
        assert studio['rpc'](request).keymap.set_layer_binding == 0
        pressed.add((5,10)); advance(20)
        pressed.add((1,int(digit))); advance(20)
        pressed.clear(); advance(20)
        pressed.add((3,1)); packets = advance(20)
        pressed.clear(); packets += advance(20)
        assert any(p[0] == 1 and 4 in p[1:] for p in packets), 'Legacy action suppressed USB typing'
        assert u.dp_pullup()
        assert studio['keymap']().layers[0].bindings[45] == reloaded.layers[0].bindings[45]
    request = studio['pb'].Request()
    request.keymap.save_changes = True
    assert studio['rpc'](request).keymap.save_changes.ok
    quiet()
    print('PASS: legacy OUT_BLE/USB/NONE/TOG bindings cannot override physical ON')
    s['ota_command'](0xff07)
    s['ota_command'](0xff03)
    print('PASS: post-pairing flash self-test from ON; reconnect below verifies preserved bond')
    # PD7 is deliberately irrelevant; both-low follows stock's BT precedence.
    move(0x80)
    assert not u.dp_pullup(), 'Both-low selector incorrectly enabled USB'
    count = m.reset_count
    level[0] = 0x00; advance(150)
    assert m.reset_count == count, 'Unused PD7 affected mode selection'
    s['start_resets'] = m.reset_count
    s['central'] = s['ble_central'].Central(m, radio, connect_after_ms=0, pair=False,
        event_hooks=[s['encrypted_reconnect']], establish=True, ll_rules=True)
    s['until'](lambda: s['central'].enc['tx'] and s['central'].enc['rx'])
    for digit in range(4, 8):
        pressed.add((5,10)); advance(20)
        s['tap'](1, digit)
        pressed.clear(); advance(20)
        baseline = len(s['central'].ntf)
        s['tap'](3, 1)
        s['until'](lambda: any(h == 20 and '04' in p for _,h,p in s['central'].ntf[baseline:]), 1000)
        assert not u.dp_pullup(), 'Legacy action enabled USB from BT'
    print('PASS: all legacy output actions preserve encrypted BT typing without USB')
    snapshots.append(s['stack_snapshot']())
    for snapshot in snapshots:
        for row in snapshot:
            assert row['spare'] >= 128, row
    print('PASS: both-low selects BT, PD7 is ignored, mode-transition stack margins >=128 bytes')
