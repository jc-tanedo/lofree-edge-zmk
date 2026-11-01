"""Boot the exact Edge build through three unconfirmed power cycles, offline."""
from pathlib import Path
import os
import sys

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / '.deps/tc32-devtools/emulator'))
import tc32emu as te
import run_boot

build = root / 'firmware/build' / os.environ.get('EDGE_TEST_BUILD', 'lofree_edge-usb') / 'zephyr'
image = (build / 'zmk.ota.bin').read_bytes()
# Synthetic retained slot: our own image, never vendor firmware.
stock = image
addr, sizes = run_boot.symbols(str(build / 'zmk.elf'))
flash = te.Flash()
flash.mem[:len(stock)] = stock
flash.mem[8:12] = bytes(4)
flash.mem[0x20000:0x20000+len(image)] = image
machine = te.Machine(flash, symbols=addr, max_log=30)
for boot in range(1, 4):
    print(f'boot {boot}: slot {machine.boot_slot:#x}')
    try:
        machine.run_ms(1000 if boot == 3 else 30,
                       idle_ranges=run_boot.idle_ranges(addr, sizes))
    except te.SoftwareReset:
        machine.reset()
        print(f'revert reboot: slot {machine.boot_slot:#x}')
        assert machine.boot_slot == 0
        assert flash.mem[8:12] == b'KNLT'
        assert flash.mem[0x20008] != 0x4b
        print('PASS: exact experimental image restored synthetic retained-image boot flags')
        break
    machine.reset()
else:
    raise SystemExit('FAIL: no revert on third unconfirmed boot')
