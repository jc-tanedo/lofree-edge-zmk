import unittest
from lofree_edge.board_status import decode_switch_status


class SwitchStatusTests(unittest.TestCase):
    def report(self, schema):
        packet = bytearray(32)
        packet[:4] = bytes([7, ord('E'), ord('D'), schema])
        return packet

    def test_v1_reserved_bytes_are_never_interpreted_as_switch_data(self):
        packet = self.report(1)
        packet[24:] = bytes([255] * 8)
        self.assertIsNone(decode_switch_status(packet)['switch_inputs'])
        self.assertFalse(decode_switch_status(packet)['switch_diagnostics'])

    def test_v2_levels_and_input_configuration_are_distinct(self):
        packet = self.report(2)
        packet[18], packet[20] = 0xe0, 0xff
        packet[24:27] = bytes([0xa0, 0xe0, 1])
        status = decode_switch_status(packet)
        self.assertTrue(status['switch_diagnostics'])
        inputs = status['switch_inputs']
        self.assertTrue(inputs['pd5'])
        self.assertFalse(inputs['pd6'])
        self.assertTrue(inputs['pd7'])
        self.assertEqual(inputs['pd_input_enable'], 0xe0)
        self.assertEqual(inputs['pd_output_disable'], 0xe0)

    def test_unknown_or_truncated_reports_are_rejected(self):
        for packet in [self.report(3), self.report(2)[:31], bytes(32)]:
            with self.assertRaises(ValueError):
                decode_switch_status(packet)
