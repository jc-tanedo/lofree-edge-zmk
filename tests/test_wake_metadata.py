# SPDX-License-Identifier: GPL-3.0-or-later
"""Privacy and framing checks for the optional owner-host diagnostic filter."""
import importlib.util
from pathlib import Path
import unittest

p=Path(__file__).resolve().parents[1]/'tools/filter_edge_wake_metadata.py'
spec=importlib.util.spec_from_file_location('wake_metadata',p)
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class WakeMetadataTests(unittest.TestCase):
    def test_spaced_ansi_header_keeps_hci_timestamp(self):
        result=module.Metadata().feed('\x1b[K>  ACL Data RX: Handle 64 #2 [hci0] 30.0123')
        self.assertIn('30.0123',result)
        self.assertNotIn('\x1b',result)

    def test_keyboard_bytes_become_activity_only(self):
        parser=module.Metadata()
        output=[]
        for data in ['0000040000000000','0000000000000000']:
            for line in ['ATT: Handle Value Notification (0x1b) len 10','Handle: 0x0014','Data: '+data]:
                result=parser.feed(line)
                if result:output.append(result)
        self.assertEqual([s for s in output if s.startswith('KEYBOARD')],
                         ['KEYBOARD state: ACTIVE','KEYBOARD state: RELEASED'])
        self.assertNotIn('000004','\n'.join(output))

    def test_other_payloads_and_secret_fields_are_dropped(self):
        parser=module.Metadata()
        for line in ['Long term key: synthetic-never-log','Address: 01:02:03:04:05:06',
                     'Data: 0000040000000000','Value: synthetic-never-log']:
            self.assertIsNone(parser.feed(line))
        parser.feed('ATT: Handle Value Notification (0x1b) len 10')
        parser.feed('Handle: 0x0018')
        self.assertIsNone(parser.feed('Data: 0000040000000000'))

    def test_new_packet_clears_pending_notification(self):
        parser=module.Metadata()
        parser.feed('ATT: Handle Value Notification (0x1b) len 10')
        parser.feed('Handle: 0x0014')
        parser.feed('> HCI Event: LE Meta Event')
        self.assertIsNone(parser.feed('Data: 0000040000000000'))

if __name__=='__main__':unittest.main()
