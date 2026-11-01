import unittest
from pathlib import Path

from lofree_edge.firmware_update import (
    build_data_report,
    build_finish_report,
    build_ota_report,
    build_start_report,
    crc16_modbus,
    declared_image_size,
    iter_update_reports,
)


def synthetic_image():
    data = bytearray(range(52))
    data[24:28] = (52).to_bytes(4, 'little')
    return bytes(data)

class FirmwareUpdatePacketTests(unittest.TestCase):
    def test_outer_frame_and_start_marker(self):
        self.assertEqual(
            build_start_report(),
            bytes.fromhex("050b0109050452280001ff") + bytes(22),
        )
        with self.assertRaises(ValueError):
            build_ota_report(bytes(25))

    def test_crc_reference_vector(self):
        self.assertEqual(crc16_modbus(b"123456789"), 0x4B37)

    def test_synthetic_first_data_packet(self):
        image = synthetic_image()
        packet = build_data_report(0, image[:16])
        self.assertEqual(packet[11:27], image[:16])
        self.assertEqual(packet[:11], bytes.fromhex('051d011b17045228000000'))

    def test_declared_size_padding_and_finish(self):
        image = synthetic_image()
        self.assertEqual(declared_image_size(image), 52)
        reports = list(iter_update_reports(image))
        self.assertEqual(len(reports), 6)
        self.assertEqual(reports[-2][11:27], image[48:] + bytes([255])*12)
        self.assertEqual(reports[-1], build_finish_report(3))

    def test_rejects_bad_sizes_and_blocks(self):
        for image in (b"", bytes(28), bytes(24) + (0x20001).to_bytes(4, "little")):
            with self.subTest(length=len(image)), self.assertRaises(ValueError):
                declared_image_size(image)
        for index, data in ((-1, b"x"), (0x10000, b"x"), (0, b""), (0, bytes(17))):
            with self.subTest(index=index, length=len(data)), self.assertRaises(ValueError):
                build_data_report(index, data)


if __name__ == "__main__":
    unittest.main()
