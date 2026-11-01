"""Exercise built Edge USB LED reports, shared-pin scanning and Fn lighting.

The electrical matrix is an explicit model of the recovered active-low wiring;
this validates compiled control flow, not physical brightness or board wiring.
"""
from pathlib import Path
import hashlib
import os
import sys

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / '.deps/tc32-devtools/emulator'))
import tc32emu as te
import run_boot
import usb_model

build = root / 'firmware/build' / os.environ.get('EDGE_TEST_BUILD', 'lofree_edge-usb') / 'zephyr'
addresses, sizes = run_boot.symbols(str(build / 'zmk.elf'))
flash = te.Flash()
image = (build / 'zmk.ota.bin').read_bytes()
print('IMAGE SHA-256:', hashlib.sha256(image).hexdigest(), flush=True)
# Synthetic retained slot: our own image, never vendor firmware.
stock = image
flash.mem[:len(stock)] = stock
flash.mem[8:12] = bytes(4)
flash.mem[0x20000:0x20000+len(image)] = image
if os.environ.get('EDGE_TEST_UNIT_ID'):
    # Manufactured per-unit data fixture, not an actual device write.
    flash.mem[0x76000:0x76004] = bytes.fromhex(os.environ['EDGE_TEST_UNIT_ID'])
m = te.Machine(flash, symbols=addresses, max_log=20)
idle = run_boot.idle_ranges(addresses, sizes)
if os.environ.get('EDGE_TEST_STACKS'):
    import stack_use
    stack_ranges, stack_painted = stack_use.paint(m, str(build/'zmk.elf'), addresses)
columns = [(1,5),(1,2),(1,1),(1,0),(0,4),(0,3),(0,2),(0,1),(0,0),
           (3,4),(3,2),(3,1),(3,0),(2,7),(2,6)]
rows = [(2,5),(2,4),(2,3),(2,2),(2,0),(1,7)]
pressed = set()
pads = m.pad_levels


def board_pads(port):
    level, floating = pads(port)
    for row, col in pressed:
        rp, rb = rows[row]
        cp, cb = columns[col]
        base = 0x580 + cp*8
        r = m.regs_mem
        if rp == port and not (r[base+2] & (1<<cb)) and not (r[base+3] & (1<<cb)):
            level &= ~(1<<rb)
            floating &= ~(1<<rb)
    return level, floating


m.pad_levels = board_pads
u = usb_model.UsbModel(m, irq_lines=False)
assert u.run_until(u.dp_pullup, 100), 'USB never attached'
u.bus_reset()
assert len(u.get_descriptor(1, length=18)) == 18
configuration = u.get_descriptor(2)
interfaces = []
interface = None
offset = 0
while offset < len(configuration):
    desc = configuration[offset:offset+configuration[offset]]
    assert len(desc) >= 2
    if desc[1] == 4:
        interface = dict(number=desc[2], klass=desc[5], endpoints=[])
        interfaces.append(interface)
    elif desc[1] == 5:
        interface['endpoints'].append(desc[2])
    offset += len(desc)
hids = [entry for entry in interfaces if entry['klass'] == 3]
assert len(hids) == 2
keyboard_interface, vendor_interface = (entry['number'] for entry in hids)
keyboard_ep = hids[0]['endpoints'][0] & 0x7f
print(f'USB interface/endpoint map: {interfaces}')
u.control(bytes([0,5,1,0,0,0,0,0]))
u.control(bytes([0,9,1,0,0,0,0,0]))


def advance(ms=20):
    packets = []
    for _ in range(ms):
        m.run_ms(m.ms()+1, idle_ranges=idle)
        packet = u.in_ep(keyboard_ep)
        if packet:
            packets.append(bytes(packet))
    return packets


def caps_report(on):
    u.control(bytes([0x21,9,1,2,keyboard_interface,0,2,0]), out=bytes([1,2 if on else 0]))
    packets = advance()
    assert bool(m.regs_mem[0x58b] & 0x20) == (not on), 'Caps PB5 idle level wrong'
    return packets


advance()
assert m.regs_mem[0x780] & 0x10, 'Backlight PWM4 not enabled'
assert m.read(0x8007a4, 2) == 128, 'Backlight did not start at50%'
assert m.read(0x8007a6, 2) == 255
assert m.regs_mem[0x5ab] & 3 == 1
assert m.regs_mem[0x784] & 0x10
print('PASS: USB starts, backlight uses PB4/PWM4,50% and255-count period')

caps_report(True)
diag = u.control(bytes([0xa1,1,7,3,vendor_interface,0,32,0]))
assert diag[:4] == bytes([7,ord('E'),ord('D'),2]), 'Missing board feature7 status'
assert diag[5:8] == bytes([2,1,2]) and diag[8] == 0, 'Caps report not accepted'
assert diag[9] & 2 and diag[10] == 1, 'Board status did not observe host Caps state'
u.control(bytes([0x21,9,8,3,vendor_interface,0,3,0]),out=bytes([8,0,0]))
window=u.control(bytes([0xa1,1,8,3,vendor_interface,0,67,0]))
assert window[:3] == bytes([8,0,0]) and window[3:] == bytes(flash.mem[:64]), 'Stock slot readback wrong'
assert (m.regs_mem[0x596] & 2 and not m.regs_mem[0x592] & 2
        and not m.regs_mem[0x593] & 2), 'Running-stock PC1 is not driven low'
assert (m.regs_mem[0x59e] & 8 and not m.regs_mem[0x59a] & 8
        and m.regs_mem[0x59b] & 8), 'Stock indicator enable PD3 is not driven high'
assert (m.regs_mem[0x586] & 0x80 and not m.regs_mem[0x582] & 0x80
        and m.regs_mem[0x583] & 0x80), 'Running-stock PA7 is not driven high'
# Keep a real key in the shared column held while another column is read.
# A shared pin left low would mirror Esc into the other top-row key slots.
pressed.add((0,0))
packets = advance(25)
keyboards = [p for p in packets if p[0] == 1]
assert keyboards and any(0x29 in p[3:] for p in keyboards), 'Esc not reported'
assert all(all(k in (0,0x29) for k in p[3:]) for p in keyboards), 'Ghost key with Caps lit'
pressed.clear()
advance()
caps_report(False)
observed_off_sinks = []
original_reg_write = m.reg_write
def observe_off_scan(offset, size, value):
    original_reg_write(offset, size, value)
    if 0x580 <= offset < 0x5a0 and not m.regs_mem[0x58b] & 0x20:
        observed_off_sinks.append((bool(m.regs_mem[0x593] & 2),
                                   bool(m.regs_mem[0x583] & 0x80)))
m.reg_write = observe_off_scan
advance(30)
m.reg_write = original_reg_write
assert observed_off_sinks, 'No shared-column scan pulses were exercised'
assert all(pc1 and not pa7 for pc1,pa7 in observed_off_sinks), \
    'Caps-off matrix pulses can still energize the indicator'
print('PASS: host Caps reports drive PB5, held Esc does not ghost into other columns')
print('PASS: Caps-off scan pulses occur with both auxiliary gates disabled')

pressed.add((5,10))  # Fn
advance()
pressed.add((0,6))  # F6 / backlight increase
advance()
assert m.read(0x8007a4, 2) == 102, 'Fn+F6 did not increase brightness to60%'
pressed.remove((0,6))
advance()
pressed.add((0,12))  # F12 / volume up
packets = advance()
assert any(p[0] == 2 and b'\xe9\x00' in p[1:] for p in packets), 'Fn+F12 missing volume report'
pressed.remove((0,12))
advance()
pressed.add((0,0))  # Esc / backlight toggle
advance()
assert not m.regs_mem[0x780] & 0x10, 'Fn+Esc did not stop PWM4'
assert m.regs_mem[0x58e] & 0x10 and not m.regs_mem[0x58b] & 0x10
pressed.clear()
advance()
print('PASS: Fn+F6 changes PWM brightness, Fn+F12 emits volume-up, Fn+Esc turns light off')
print('PASS: exact compiled image lighting/USB/matrix model checks completed')
