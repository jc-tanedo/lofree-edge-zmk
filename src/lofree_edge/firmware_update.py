"""Offline encoder for the vendor updater's report-05 firmware protocol.

This module deliberately contains no HID transport.  The packet format is based
on static analysis of the bundled V0116 updater and has not been sent to a
physical keyboard.
"""

from collections.abc import Iterator


REPORT_ID = 5
REPORT_SIZE = 33
OTA_HEADER = bytes.fromhex("04522800")
BLOCK_SIZE = 16
MAX_IMAGE_SIZE = 0x20000
DECLARED_SIZE_OFFSET = 0x18


def crc16_modbus(data: bytes) -> int:
    """Return the updater's CRC: polynomial A001, initial value FFFF."""
    crc = 0xFFFF
    for value in data:
        crc ^= value
        for _ in range(8):
            crc = (crc >> 1) ^ (0xA001 if crc & 1 else 0)
    return crc


def build_ota_report(payload: bytes) -> bytes:
    """Wrap an updater payload in the observed fixed-size HID report."""
    if len(payload) > REPORT_SIZE - 9:
        raise ValueError("OTA payload cannot exceed 24 bytes")
    report = bytearray(REPORT_SIZE)
    report[0] = REPORT_ID
    report[1] = len(payload) + 9
    report[2] = 1
    report[3] = len(payload) + 7
    report[4] = len(payload) + 3
    report[5:9] = OTA_HEADER
    report[9:9 + len(payload)] = payload
    return bytes(report)


def build_start_report() -> bytes:
    """Encode the updater's two-byte start marker (01 FF)."""
    return build_ota_report(bytes.fromhex("01ff"))


def build_data_report(block_index: int, data: bytes) -> bytes:
    """Encode one 16-byte block, padding only a short final block with FF."""
    if not 0 <= block_index <= 0xFFFF:
        raise ValueError("Block index must fit in an unsigned 16-bit field")
    if not 1 <= len(data) <= BLOCK_SIZE:
        raise ValueError("Firmware blocks must contain 1–16 bytes")
    body = block_index.to_bytes(2, "little") + data.ljust(BLOCK_SIZE, b"\xff")
    payload = body + crc16_modbus(body).to_bytes(2, "little")
    return build_ota_report(payload)


def build_finish_report(last_block_index: int) -> bytes:
    """Encode the end marker and complemented last-block index."""
    if not 0 <= last_block_index <= 0xFFFF:
        raise ValueError("Block index must fit in an unsigned 16-bit field")
    low = last_block_index & 0xFF
    high = last_block_index >> 8
    return build_ota_report(bytes((0x02, 0xFF, low, high, low ^ 0xFF, high ^ 0xFF)))


def declared_image_size(image: bytes) -> int:
    """Read and validate the updater length stored at firmware offset 0x18."""
    if len(image) < DECLARED_SIZE_OFFSET + 4:
        raise ValueError("Firmware image is too short to contain its declared size")
    size = int.from_bytes(image[DECLARED_SIZE_OFFSET:DECLARED_SIZE_OFFSET + 4], "little")
    if not 0 < size <= MAX_IMAGE_SIZE:
        raise ValueError("Declared firmware size must be within 1–131072 bytes")
    if size > len(image):
        raise ValueError("Declared firmware size exceeds the supplied image")
    return size


def iter_update_reports(image: bytes) -> Iterator[bytes]:
    """Yield start, data, and finish reports without opening a device."""
    size = declared_image_size(image)
    yield build_start_report()
    last_block = (size - 1) // BLOCK_SIZE
    for block_index in range(last_block + 1):
        start = block_index * BLOCK_SIZE
        yield build_data_report(block_index, image[start:min(start + BLOCK_SIZE, size)])
    yield build_finish_report(last_block)
