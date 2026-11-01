# SPDX-License-Identifier: GPL-3.0-or-later
"""Connected low-power acceptance checks on the existing encrypted radio model."""
def run(s):
    m,advance,central,until,tap,pressed=(s[k] for k in ('m','advance','central','until','tap','pressed'))
    # Deliberately age only the activity timestamp; policy and sleep remain compiled code.
    rows=[line.split() for line in (s['ROOT']/'firmware/build'/s['os'].environ['EDGE_TEST_BUILD']/'zephyr/zmk.map').read_text().splitlines()]
    targets=[int(p[0],16) for p in rows if p and p[-1]=='last_activity']
    assert len(targets)==1
    at=targets[0]-0x840000
    def age():
        m.sram[at:at+8]=((int(m.ms())-901000)&((1<<64)-1)).to_bytes(8,'little')
    reset=m.reset_count
    # Inject a physical press exactly at sleep entry, after the policy's held
    # position check. The board must abort entry and scan/report that press.
    entry=s['addresses']['key_matrix_sleep']
    original=m.hooks.get(entry)
    injected=[]
    def race(mm):
        if mm.r[0] and not injected:
            injected.append(True);pressed.add((3,1))
            if original is None:m.hooks.pop(entry,None)
            else:m.hooks[entry]=original
    m.hooks[entry]=race
    before=len(central.ntf);age()
    until(lambda:any(h==20 and '04' in payload for _,h,payload in central.ntf[before:]),1500)
    assert injected and m.asleep is None,'Entry-race key was not scanned'
    pressed.clear();advance(100)
    print('PASS: physical press racing with sleep entry is scanned rather than waiting for release',flush=True)
    for cycle in range(3):
        wake_count=len(m.wakes)
        age()
        until(lambda:m.asleep is not None,1500)
        assert m.analog[0x26]&8,'No pad wake in actual suspend'
        assert not m.regs_mem[0x780]&0x10,'PWM still enabled during scan sleep'
        assert not m.regs_mem[0x583]&0x80,'Caps gate active while asleep'
        assert not s['u'].dp_pullup(),'USB enumerated while sleeping BT'
        before=len(central.ntf)
        tap(3,1)
        until(lambda:any(h==20 and '04' in payload for _,h,payload in central.ntf[before:]),1500)
        until(lambda:any(h==20 and payload=='0000000000000000' for _,h,payload in central.ntf[before:]),1500)
        assert len(m.wakes)>wake_count, 'No new pad wake for this cycle'
        assert m.reset_count==reset
    # Keep a physical key held even if the deadline passes.
    pressed.add((3,1));advance(30);age()
    wakes=len(m.wakes)
    advance(300)
    assert m.asleep is None and len(m.wakes)==wakes,'Held key entered low power'
    pressed.clear();advance(100)
    assert central.enc['mic_fail']==0
    print('PASS: compiled connected suspend/pad wake x3, first key/release, no reset, encrypted link and held-key inhibition',flush=True)
