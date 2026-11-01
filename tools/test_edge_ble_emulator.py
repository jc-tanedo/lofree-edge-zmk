"""Exercise the compiled Edge BLE+Studio build through radio/central models.

No hardware access. Runs existing USB/lighting/Studio persistence coverage first,
then Secure Connections passkey entry and encrypted HID notifications. These are
modeled timings and peripherals, not evidence of physical RF performance.
"""
from pathlib import Path
import json
import os
import runpy
import sys

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault('EDGE_TEST_BUILD', 'lofree_edge-ble-studio')
os.environ['EDGE_TEST_STACKS']='1'
os.environ['EDGE_TEST_UNIT_ID']='11223344'
state = runpy.run_path(str(ROOT/'tools/test_edge_studio_emulator.py'))
m, advance = state['m'], state['advance']
lighting = state['state']
pressed = lighting['pressed']
addresses = lighting['addresses']
import ble_radio
import ble_central
import stack_use
import tc32emu as te

from google.protobuf.json_format import MessageToDict
native_capture = {
    'map': MessageToDict(state['reloaded'], always_print_fields_with_no_presence=True),
    'behaviors': [MessageToDict(d, always_print_fields_with_no_presence=True) for d in state['behavior_details'].values()],
}
(ROOT/'build/reports/edge-ble-native-keymap.json').write_text(json.dumps(native_capture,indent=2)+'\n')
# The actual RPC metadata must advertise the native stack's BLE output option.
output = next(d for d in native_capture['behaviors'] if d['displayName'].startswith('Output Selection'))
assert any(v.get('constant')==2 for group in output['metadata'] for v in group['param1'])
print('PASS: native Bluetooth/output metadata and captured keymap for export validation')

def stack_snapshot():
    elf=ROOT/'firmware/build'/os.environ['EDGE_TEST_BUILD']/'zephyr/zmk.elf'
    result=[]
    for name,lo,size in stack_use.stacks(str(elf)):
        offset=lo-te.SRAM_BASE
        mem=m.sram[offset+4:offset+size]
        first=next((i for i,b in enumerate(mem) if b!=0xaa),len(mem))
        used=len(mem)-first
        result.append({'name':name,'size':size,'used':used,'spare':size-used-4})
    return result

# Confirm through the updater while ON; USB must not exist in BT.
# Accept only the emulated image through the real updater's self-test/confirm.
# This test has already used two trial boots; a third unconfirmed boot must roll
# back by design. Never disable that firmware protection to test reconnection.
sys.path.insert(0,str(ROOT/'.deps/zmk-tc32/tc32/scripts'))
import telink_ota
vendor_ep=lighting['hids'][1]['endpoints'][0]&127
vendor_interface=lighting['vendor_interface']
u=lighting['u']
def ota_command(command):
    frame=telink_ota.command_frame(command)
    u.control(bytes([0x21,9,5,2,vendor_interface,0,len(frame),0]),out=frame)
    end=m.ms()+5000
    while m.ms()<end:
        advance(1)
        reply=u.in_ep(vendor_ep)
        if reply and int.from_bytes(reply[9:11],'little')==command:
            assert reply[29]==0, (hex(command),reply.hex())
            return bytes(reply)
    raise AssertionError(f'No emulated OTA acknowledgement for {command:x}')
ota_command(0xff07)
confirmation=ota_command(0xff03)
assert confirmation[17]==0 and confirmation[18]&4
print('PASS: emulator-native flash self-test and confirmation before controlled mode restart')


controlled = '\nCONFIG_LOFREE_EDGE_MODE_SWITCH=y\n' in (ROOT/'firmware/build'/os.environ['EDGE_TEST_BUILD']/'zephyr/.config').read_text()
if controlled:
    pads = m.pad_levels
    switch_level = 0xc0  # PD5 low selects BT, with USB cable modeled present.
    def selector_pads(port):
        value, floating = pads(port)
        if port == 3:
            return (value & 0x1f) | switch_level, floating & 0x1f
        return value, floating
    m.pad_levels = selector_pads
    try:
        advance(2500)
    except te.SoftwareReset:
        m.reset()
    else:
        raise AssertionError('Physical selector did not request guarded restart')
    advance(300)
    assert not u.dp_pullup(), 'BT must not enumerate USB/Studio'
    print('PASS: ON-to-BT guarded restart disables USB data')

radio = ble_radio.Radio(m)
steps = []
def host_script(c):
    paired = yield ('pair',)
    assert paired.get('ok'), paired
    steps.append('paired')
    response = yield bytes.fromhex('1215000100')  # Keyboard input CCCD, handle21.
    assert response == b'\x13', response.hex()
    response = yield bytes.fromhex('1219000100')  # Consumer input CCCD, handle25.
    assert response == b'\x13', response.hex()
    steps.append('ready')

class SecureCentral(ble_central.Central):
    def start_pairing(self, sc=False):
        super().start_pairing(sc=True)

central = SecureCentral(m, radio, connect_after_ms=0, att_script=host_script,
                        interval=40, timeout=42,  # Captured CachyOS 50ms/420ms link parameters.
                        log=lambda text: print(text) if 'empty' not in text else None,
                        establish=True, ll_rules=True)
central.io_cap = 0  # Host displays the passkey; keyboard enters it.
central.mitm = True
central.passkey = 123456  # Deterministic host-side test input, never firmware entropy.
start_resets = m.reset_count

def until(predicate, duration=4000):
    end = m.ms()+duration
    while m.ms()<end and not predicate():
        try:
            advance(1)
        except te.SoftwareReset:
            pc=m.r[15]
            nearby=sorted(((abs(pc-a),n,hex(a)) for n,a in addresses.items()))[:5]
            print('UNEXPECTED RESET:',m.ms(),hex(pc),hex(m.r[14]),nearby,flush=True)
            raise
        assert m.reset_count == start_resets, 'Unexpected firmware reset'
    assert predicate(), f'Timed out at {m.ms():.1f}ms; central={central.state}, steps={steps}'

def tap(row,col):
    pressed.add((row,col)); advance(18)
    pressed.discard((row,col)); advance(18)

# Inspect the real compiled passkey-request flag; do not inject pairing state.
elf = ROOT/'firmware/build'/os.environ['EDGE_TEST_BUILD']/'zephyr/zmk.elf'
pk = lighting['run_boot'].data_symbols(str(elf))['pk']-te.SRAM_BASE
until(lambda: central.displayed_passkey is not None and bool(m.sram[pk]))
for digit in f'{central.displayed_passkey:06d}':
    tap(1,int(digit) or 10)
tap(3,13)  # Physical Enter.
until(lambda: 'ready' in steps)
assert central.enc['tx'] and central.enc['rx'], 'HID not encrypted'
print('PASS: real compiled Secure Connections passkey pairing and HID subscriptions')
# Diagnostic words are scalar metadata; valid host requests must not be rejected.
diag_at = lighting['run_boot'].data_symbols(str(elf)).get('edge_adv_diag')
if diag_at is not None:
    import struct
    diag = struct.unpack_from('<12I', m.sram, diag_at-te.SRAM_BASE)
    assert diag[0] >= 1 and diag[1:6] == (0,0,0,0,0), diag
    assert diag[6] == 47 and diag[9] == 40 and diag[10] & 0xffff == 42, diag
    print('PASS: request diagnostic counters; captured CachyOS interval/timeout accepted', diag)


baseline = len(central.ntf)
tap(3,1)  # Physical A.
until(lambda: any(handle==20 and '04' in payload for _,handle,payload in central.ntf[baseline:]),1000)
until(lambda: any(handle==20 and payload=='0000000000000000' for _,handle,payload in central.ntf[baseline:]),1000)
print('PASS: encrypted BLE keyboard press and release')

baseline = len(central.ntf)
pressed.add((5,10));advance(20)  # Fn.
tap(0,8)  # F8: play/pause.
pressed.discard((5,10));advance(40)
until(lambda: any(handle==24 and payload.startswith('cd00') for _,handle,payload in central.ntf[baseline:]),1000)
print('PASS: encrypted BLE consumer/media shortcut')

central.att_send(bytes.fromhex('121c0002'))  # Caps Lock output over encrypted GATT.
advance(100)
assert not m.regs_mem[0x592] & 2 and not m.regs_mem[0x593] & 2, 'BLE Caps indicator not enabled'
central.att_send(bytes.fromhex('121c0000'))
advance(100)
print('PASS: encrypted BLE LED output drives the Caps indicator')

# Reboot the keyboard while the modeled host retains its bond. No new pairing.
stack_before_reset = stack_snapshot()
(ROOT/'build/tmp/edge-ble-reconnect-flash.bin').write_bytes(lighting['flash'].mem)
(ROOT/'build/tmp/edge-ble-reconnect-host.json').write_text(json.dumps({'ltk':central.enc['ltk'],'adva':central.adva.hex()}))
for symbol in ['z_fatal_error','k_sys_fatal_error_handler','z_check_stack_sentinel']:
    if symbol in addresses and symbol != 'z_check_stack_sentinel':
        def fatal_hook(mm,name=symbol):
            raise AssertionError(f'{name} at {mm.ms():.3f}ms: r0={mm.r[0]}, lr={hex(mm.r[14])}')
        m.hooks[addresses[symbol]]=fatal_hook
ltk, old_address = central.enc['ltk'], central.adva
central.go_silent(0)
m.reset()
start_resets = m.reset_count
assert m.boot_slot == 0x20000

def encrypted_reconnect(c,event):
    if event==4:
        c.enc['ltk']=ltk
        c.enc['skdm']=bytes.fromhex('1020304050607080')
        c.enc['ivm']=bytes.fromhex('12345678')
        c.queue_ll(bytes([3])+bytes(10)+c.enc['skdm']+c.enc['ivm'])

central = ble_central.Central(m,radio,connect_after_ms=0,pair=False,
    event_hooks=[encrypted_reconnect],establish=True,ll_rules=True,
    log=lambda text: print(text) if 'empty' not in text else None)
until(lambda: central.enc['tx'] and central.enc['rx'])
assert central.adva==old_address, 'Advertising address changed after reboot'
advance(150)
baseline=len(central.ntf)
tap(3,1)
until(lambda:any(handle==20 and '04' in payload for _,handle,payload in central.ntf[baseline:]),1000)
assert central.enc['mic_fail']==0
print('PASS: persisted bond and CCCDs reconnect after reset without re-pairing')

# Stack sentinel is the first word, so exclude it from the 0xaa watermark scan.
results=[]
for current in stack_snapshot():
    before=next(row for row in stack_before_reset if row['name']==current['name'])
    row=before if before['used']>current['used'] else current
    results.append(row)
    assert row['spare']>=128, row
print('STACK WATERMARKS: '+json.dumps(results))
assert lighting['flash'].mem[8:12] == bytes(4), 'Retained stock was changed'
print('PASS: combined Studio/USB/BLE compiled-image checks; retained stock untouched')

# The observation-only variant intentionally retains simultaneous legacy outputs.
config = (ROOT/'firmware/build'/os.environ['EDGE_TEST_BUILD']/'zephyr/.config').read_text()
if '\nCONFIG_LOFREE_EDGE_MODE_SWITCH=y\n' in config:
    from edge_mode_emulator_checks import run
    run(globals())
