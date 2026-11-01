# SPDX-License-Identifier: GPL-3.0-or-later
"""Stack watermarks at a modeled boundary; no device access."""
def check(m, elf, minimum=128):
    import stack_use
    import tc32emu as te
    rows=[]
    for name,lo,size in stack_use.stacks(str(elf)):
        memory=m.sram[lo-te.SRAM_BASE+4:lo-te.SRAM_BASE+size]
        assert len(memory)==size-4,('Stack outside modeled SRAM',name)
        first=next((i for i,b in enumerate(memory) if b!=0xaa),len(memory))
        spare=size-(len(memory)-first)-4
        rows.append({'name':name,'spare':spare})
        assert spare>=minimum,(name,spare,minimum)
    assert rows,'No modeled stack regions found'
    return rows
