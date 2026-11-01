"""Sensitivity experiment: publish advertising RX DMA only at packet completion.

This is a timing hypothesis, NOT an observation of real TLSR DMA behavior.
Cancellation on STOP/channel changes prevents delivery of packets cut short by
firmware. Original radio model/source remains unchanged.
"""
from pathlib import Path
import runpy
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.deps/tc32-devtools/emulator'))
import ble_radio
Base = ble_radio.Radio

class DelayedRadio(Base):
    def dma_rx(self,pdu,t_start,status=True):
        if not status:
            self.pending_adv = (bytes(pdu), t_start, len(self.cmds))
            return
        return super().dma_rx(pdu,t_start,status)

    def adv_rx_end(self,pdu,t_rx,who):
        pending = getattr(self,'pending_adv',None)
        if pending is not None and pending[:2] == (bytes(pdu),t_rx):
            self.pending_adv = None
            if len(self.cmds) != pending[2]:
                # Host sent CONNECT_IND even though the peripheral cut reception.
                if who is not None and pdu[0]&15 == 5:
                    who.on_connect_sent(pdu,self.m.ms())
                print('DELAYED-DMA: advertising receive cut short before packet completion',flush=True)
                return
            super().dma_rx(pdu,t_rx,True)
        return super().adv_rx_end(pdu,t_rx,who)

ble_radio.Radio = DelayedRadio
runpy.run_path(str(ROOT/'tools/test_edge_ble_emulator.py'),run_name='__main__')
