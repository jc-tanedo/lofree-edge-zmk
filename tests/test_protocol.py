import unittest

from lofree_edge.protocol import (ProtocolError, build_read_request, parse_read_response,
                                 build_transaction_request, build_write_request, build_keymap_request)


class ProtocolTests(unittest.TestCase):
    def test_windows_current_profile_read_vector(self):
        # 0x48bb37: offset 0, length 1; 0x47fb40: command 05, sum bytes 3..63.
        self.assertEqual(build_read_request(0, 1), bytes.fromhex("0406000501000000") + bytes(56))

    def test_little_endian_offset_and_checksum_carry(self):
        self.assertEqual(build_read_request(0x12FE, 56), bytes.fromhex("044d010538fe1200") + bytes(56))

    def test_bounds(self):
        for offset, length in [(-1, 1), (65536, 1), (0, 0), (0, 57), (65535, 2)]:
            with self.subTest(offset=offset, length=length), self.assertRaises(ValueError):
                build_read_request(offset, length)

    def test_only_verified_read_commands_are_allowed(self):
        self.assertEqual(build_read_request(0, 34, 3)[:8], bytes.fromhex("0425000322000000"))
        self.assertEqual(build_read_request(0, 56, 8)[:8], bytes.fromhex("0440000838000000"))
        for command in (1, 2, 6, 0xAA, 0x12):
            with self.subTest(command=command), self.assertRaises(ValueError):
                build_read_request(0, 1, command)

    def test_offline_write_checksum_includes_payload(self):
        self.assertEqual(build_write_request(0x1201, b"\x11\x22\x33"),
                         bytes.fromhex("0482000603011200112233") + bytes(53))

    def test_offline_transaction_headers(self):
        self.assertEqual(build_transaction_request(), bytes.fromhex("0401000100000000") + bytes(56))
        self.assertEqual(build_transaction_request(finish=True), bytes.fromhex("0402000200000000") + bytes(56))

    def test_keymap_command_and_bounds(self):
        # Slot12 is byte36, with a type20, modifier00, usage68 (F13) triple.
        self.assertEqual(build_keymap_request(36, bytes.fromhex("200068")),
                         bytes.fromhex("04b8000903240000200068") + bytes(53))
        with self.assertRaises(ValueError):
            build_keymap_request(383, b"\0\0")

    def test_response_data(self):
        response = bytes.fromhex("04280005022100000a0b") + bytes(54)
        self.assertEqual(parse_read_response(response, 0x21, 2), b"\x0a\x0b")

    def test_rejects_corrupted_truncated_wrong_range_or_status(self):
        good = bytes.fromhex("04280005022100000a0b") + bytes(54)
        corrupt = bytearray(good)
        corrupt[1] ^= 1
        status = bytearray(good)
        status[7] = 0xFF
        for packet, offset, length in [(bytes(corrupt), 0x21, 2), (good[:-1], 0x21, 2),
                                        (good, 0x20, 2), (good, 0x21, 1), (bytes(status), 0x21, 2)]:
            with self.subTest(packet=packet, offset=offset, length=length), self.assertRaises(ProtocolError):
                parse_read_response(packet, offset, length)

    def test_physical_edge_profile_block(self):
        # Captured 2026-10-30: response echoes request checksum 0x27 even though
        # its nonzero data makes the sum over the entire response different.
        response = bytes.fromhex(
            "0427000522000000000502020001ffffff0000000000000000000000ff000000"
            "0000020000000000000000000000000000000000000000000000000000000000"
        )
        data = parse_read_response(response, 0, 34)
        self.assertEqual(len(data), 34)
        self.assertEqual(data[:9], bytes.fromhex("000502020001ffffff"))


if __name__ == "__main__":
    unittest.main()
