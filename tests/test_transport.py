from contextlib import ExitStack
from pathlib import Path
import struct
import unittest
from unittest.mock import patch

from lofree_edge.protocol import build_read_request, build_write_request, build_transaction_request, build_keymap_request
from lofree_edge.transport import DESCRIPTOR_SHA256, exchange_read, EdgeSession


class TransportTests(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.stack.enter_context(patch("lofree_edge.transport.platform.machine", return_value="x86_64"))
        self.stack.enter_context(patch("lofree_edge.transport.discover", return_value=[{
            "path": "/dev/hidraw-test", "supported_descriptor": True,
            "descriptor_sha256": DESCRIPTOR_SHA256,
        }]))
        self.stack.enter_context(patch("lofree_edge.transport.os.open", return_value=123))
        self.close = self.stack.enter_context(patch("lofree_edge.transport.os.close"))
        self.write = self.stack.enter_context(patch("lofree_edge.transport.os.write", return_value=64))
        self.stack.enter_context(patch("lofree_edge.transport.fcntl.flock"))
        self.descriptor = (Path(__file__).parent / "fixtures/edge-interface-01.hid").read_bytes()
        self.ioctl = self.stack.enter_context(patch("lofree_edge.transport.fcntl.ioctl", side_effect=self.kernel_metadata))

    def kernel_metadata(self, fd, operation, buffer, mutate):
        self.assertEqual(fd, 123)
        if operation == 0x80084803:
            struct.pack_into("=IHH", buffer, 0, 3, 0x05AC, 0x0256)
        elif operation == 0x80044801:
            struct.pack_into("=I", buffer, 0, len(self.descriptor))
        elif operation == 0x90044802:
            # Regression: requesting the maximum (4096) was rejected by the
            # physical device's kernel ioctl. Use its actual descriptor size.
            self.assertEqual(struct.unpack_from("=I", buffer)[0], len(self.descriptor))
            buffer[4:4 + len(self.descriptor)] = self.descriptor
        else:
            self.fail(f"Unexpected ioctl {operation:#x}")

    def test_metadata_validation_then_read_ignores_other_report_collections(self):
        packet = build_read_request(0, 1)
        with patch("lofree_edge.transport.select.select", return_value=([123], [], [])), \
                patch("lofree_edge.transport.os.read", side_effect=[b"\x01keyboard-event", packet]):
            self.assertEqual(exchange_read(packet), packet)
        self.write.assert_called_once_with(123, packet)
        self.close.assert_called_once_with(123)

    def test_identity_mismatch_prevents_sending(self):
        def wrong_identity(fd, operation, buffer, mutate):
            struct.pack_into("=IHH", buffer, 0, 3, 0x1234, 0x5678)
        self.ioctl.side_effect = wrong_identity
        with self.assertRaisesRegex(OSError, "identity differs"):
            exchange_read(build_read_request(0, 1))
        self.write.assert_not_called()
        self.close.assert_called_once_with(123)

    def test_non_read_command_prevents_sending(self):
        for packet in (build_write_request(0, b"\x00"), build_transaction_request(),
                       build_transaction_request(finish=True), build_keymap_request(0, b"\x20\x00\x29")):
            with self.subTest(packet=packet), self.assertRaises(ValueError):
                exchange_read(packet)
        self.write.assert_not_called()

    def test_explicit_keymap_session_keeps_one_handle_and_rejects_lighting_writes(self):
        packets = [build_transaction_request(), build_keymap_request(36, b"\x20\x00\x68"),
                   build_transaction_request(finish=True)]
        with patch("lofree_edge.transport.select.select", return_value=([123], [], [])), \
                patch("lofree_edge.transport.os.read", side_effect=packets):
            with EdgeSession(keymap_writes=True) as session:
                for packet in packets:
                    self.assertEqual(session.exchange(packet), packet)
                with self.assertRaises(ValueError):
                    session.exchange(build_write_request(0, b"\x00"))
                self.close.assert_not_called()
        self.assertEqual(self.write.call_count, 3)
        self.close.assert_called_once_with(123)

    def test_timeout_is_bounded(self):
        with patch("lofree_edge.transport.select.select", return_value=([], [], [])):
            with self.assertRaises(TimeoutError):
                exchange_read(build_read_request(0, 1), timeout=0.01)
        self.close.assert_called_once_with(123)


if __name__ == "__main__":
    unittest.main()
