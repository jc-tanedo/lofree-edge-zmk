"""Linux hidraw transport restricted to the observed wired Edge interface."""

import fcntl
import hashlib
import os
from pathlib import Path
import platform
import select
import struct
import time

DESCRIPTOR_SHA256 = "20b4e919898960689cf9f9e3132725e7386f9e2a546161f98ae8280c370024f8"


def discover() -> list[dict]:
    devices = []
    for entry in sorted(Path("/sys/class/hidraw").glob("hidraw*")):
        try:
            device = (entry / "device").resolve(strict=True)
            interface = None
            for parent in device.parents:
                if (parent / "bInterfaceNumber").exists():
                    interface = (parent / "bInterfaceNumber").read_text().strip()
                if (parent / "idVendor").exists():
                    values = {key: (parent / key).read_text().strip() for key in
                              ("idVendor", "idProduct", "manufacturer", "product")}
                    break
            else:
                continue
            if interface != "01" or values != {
                "idVendor": "05ac", "idProduct": "0256",
                "manufacturer": "Telink", "product": "EDGE84@Lofree",
            }:
                continue
            digest = hashlib.sha256((device / "report_descriptor").read_bytes()).hexdigest()
            devices.append({"path": f"/dev/{entry.name}", "interface": interface,
                            "descriptor_sha256": digest,
                            "supported_descriptor": digest == DESCRIPTOR_SHA256,
                            "node_present": Path(f"/dev/{entry.name}").exists()})
        except (OSError, UnicodeError):
            continue  # Devices can disappear while sysfs is being enumerated.
    return devices


def _validate_request(request: bytes, keymap_writes: bool = False) -> None:
    from .protocol import (READ_COMMANDS, build_read_request, build_keymap_request,
                           build_transaction_request)
    if len(request) != 64:
        raise ValueError("Expected a64-byte report")
    offset = int.from_bytes(request[5:7], "little")
    if request[3] in READ_COMMANDS:
        expected = build_read_request(offset, request[4], request[3])
    elif keymap_writes and request[3] in (1, 2):
        expected = build_transaction_request(finish=request[3] == 2)
    elif keymap_writes and request[3] == 9:
        expected = build_keymap_request(offset, request[8:8 + request[4]])
    else:
        raise ValueError("Unsupported command for this transport")
    if request != expected:
        raise ValueError("Transport accepts only canonical packets")


def _open_edge():
    if platform.machine() not in ("x86_64", "aarch64", "i386", "i686"):
        raise OSError("Unsupported Linux ioctl architecture")
    devices = discover()
    if len(devices) != 1:
        raise OSError(f"Expected exactly one wired Edge vendor interface, found {len(devices)}")
    if not devices[0]["supported_descriptor"]:
        raise OSError("Unrecognized Edge report descriptor; inspect before sending requests")
    fd = os.open(devices[0]["path"], os.O_RDWR | os.O_NONBLOCK | os.O_CLOEXEC)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        info = bytearray(8)
        fcntl.ioctl(fd, 0x80084803, info, True)
        if struct.unpack("=IHH", info) != (3, 0x05AC, 0x0256):
            raise OSError("Opened node identity differs from the selected USB Edge")
        descriptor_size = bytearray(4)
        fcntl.ioctl(fd, 0x80044801, descriptor_size, True)
        expected_size = struct.unpack("=I", descriptor_size)[0]
        if not 0 < expected_size <= 4096:
            raise OSError("Kernel returned an invalid report descriptor size")
        descriptor = bytearray(4100)
        struct.pack_into("=I", descriptor, 0, expected_size)
        fcntl.ioctl(fd, 0x90044802, descriptor, True)
        size = struct.unpack_from("=I", descriptor)[0]
        if size != expected_size or hashlib.sha256(descriptor[4:4 + size]).hexdigest() != DESCRIPTOR_SHA256:
            raise OSError("Opened node descriptor differs from the verified vendor interface")
        return fd
    except BaseException:
        os.close(fd)
        raise


class EdgeSession:
    """Keep identity verification and the cooperative lock across a transaction."""

    def __init__(self, *, keymap_writes=False):
        self.keymap_writes = keymap_writes
        self.fd = None

    def __enter__(self):
        self.fd = _open_edge()
        return self

    def __exit__(self, *args):
        if self.fd is not None:
            os.close(self.fd)
            self.fd = None

    def exchange(self, request: bytes, timeout: float = 1.0) -> bytes:
        _validate_request(request, self.keymap_writes)
        if not 0 < timeout <= 5:
            raise ValueError("Timeout must be between zero and five seconds")
        if self.fd is None:
            raise OSError("Open an Edge session before exchanging reports")
        fd = self.fd
        if os.write(fd, request) != len(request):
            raise OSError("Incomplete HID request write")
        deadline = time.monotonic() + timeout
        while (remaining := deadline - time.monotonic()) > 0:
            if not select.select([fd], [], [], remaining)[0]:
                break
            try:
                response = os.read(fd, 64)
            except BlockingIOError:
                continue
            if not response:
                raise OSError("Edge disconnected while awaiting its response")
            # Other collections carry keyboard/mouse events; never record those.
            if response[0] == 4 and len(response) > 3 and response[3] == request[3]:
                return response
        raise TimeoutError("No command response within the deadline")


def exchange_read(request: bytes, timeout: float = 1.0) -> bytes:
    _validate_request(request)
    with EdgeSession() as session:
        return session.exchange(request, timeout)
