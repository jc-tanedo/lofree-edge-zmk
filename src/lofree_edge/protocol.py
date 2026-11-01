"""Read/keymap packets and offline lighting encoders; see docs/protocol.md."""

REPORT_SIZE = 64
REPORT_ID = 4
READ_CONFIG = 5
READ_COMMANDS = frozenset((3, 5, 7, 8, 0x1B))
MAX_PAYLOAD = 56


class ProtocolError(ValueError):
    """A response cannot be accepted as the requested configuration data."""


def build_read_request(offset: int, length: int, command: int = READ_CONFIG) -> bytes:
    if command not in READ_COMMANDS:
        raise ValueError("Unsupported read command")
    if not 0 <= offset <= 0xFFFF:
        raise ValueError("Offset must fit in an unsigned 16-bit field")
    if not 1 <= length <= MAX_PAYLOAD or offset + length > 0x10000:
        raise ValueError("Read must contain 1–56 bytes within the 16-bit address range")
    packet = bytearray(REPORT_SIZE)
    packet[0] = REPORT_ID
    packet[3] = command
    packet[4] = length
    packet[5:7] = offset.to_bytes(2, "little")
    packet[1:3] = sum(packet[3:]).to_bytes(2, "little")
    return bytes(packet)


def parse_read_response(packet: bytes, offset: int, length: int, command: int = READ_CONFIG) -> bytes:
    request = build_read_request(offset, length, command)
    if len(packet) != REPORT_SIZE:
        raise ProtocolError(f"Expected 64 bytes, received {len(packet)}")
    if packet[0] != REPORT_ID or packet[3] != command:
        raise ProtocolError("Response report ID or command does not match")
    # The physical Edge echoes the request checksum; returned data is excluded.
    if packet[1:3] != request[1:3]:
        raise ProtocolError("Response does not echo the request checksum")
    if packet[7] != 0:
        raise ProtocolError(f"Device returned status 0x{packet[7]:02x}")
    if packet[4] != length or int.from_bytes(packet[5:7], "little") != offset:
        raise ProtocolError("Response range does not match the request")
    return packet[8:8 + length]


def build_write_request(offset: int, data: bytes) -> bytes:
    """Encode command06 offline; lighting/profile writes are not sent."""
    packet = bytearray(build_read_request(offset, len(data)))
    packet[3] = 6
    packet[8:8 + len(data)] = data
    packet[1:3] = sum(packet[3:]).to_bytes(2, "little")
    return bytes(packet)


def build_transaction_request(*, finish: bool = False) -> bytes:
    """Encode observed commands01/02; power-loss persistence remains unverified."""
    packet = bytearray(REPORT_SIZE)
    packet[0] = REPORT_ID
    packet[3] = 2 if finish else 1
    packet[1] = packet[3]
    return bytes(packet)


def build_keymap_request(offset: int, data: bytes) -> bytes:
    """Encode one profile-zero command09 chunk for the observed128-slot Edge."""
    if offset < 0 or offset + len(data) > 384:
        raise ValueError("Keymap write must stay within the observed384-byte profile-zero map")
    packet = bytearray(build_write_request(offset, data))
    packet[3] = 9
    packet[1:3] = sum(packet[3:]).to_bytes(2, "little")
    return bytes(packet)


def validate_reply(response: bytes, request: bytes) -> None:
    if len(response) != 64 or response[:7] != request[:7]:
        raise ProtocolError("Reply does not match the command header")
    if response[7] != 0:
        raise ProtocolError(f"Device returned status 0x{response[7]:02x}")
