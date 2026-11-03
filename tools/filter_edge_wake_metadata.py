# SPDX-License-Identifier: GPL-3.0-or-later
"""Filter btmon to timing/protocol metadata, never HID bytes, keys or addresses.

No device commands are sent. Use a private --output outside the public tree.
Run on the actual Bluetooth host with line-buffered btmon. --cue-test compares
human-response timing while awake and after idle; it is not electrical latency.
"""
import argparse
import os
from pathlib import Path
import re
import sys
import threading
import time

ALLOWED = re.compile(
    r"^(?:[<>]\s+(?:HCI\s+(?:Event|Command)|ACL\s+Data\s+(?:RX|TX))\b|"
    r"(?:ATT|L2CAP):|LE (?:Enhanced )?Connection Complete\b|"
    r"LE Connection Update Complete\b|"
    r"(?:Status|Reason|Handle|Connection handle|Connection interval|"
    r"Connection latency|Supervision timeout|TX PHY|RX PHY):)"
)
CSI = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
ADDRESS = re.compile(r"(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}")


class Metadata:
    def __init__(self):
        self.notification = False
        self.keyboard = False

    def feed(self, line):
        clean = CSI.sub("", line).strip()
        if clean.startswith(("ATT:", ">", "<")):
            self.notification = clean.startswith("ATT: Handle Value Notification")
            self.keyboard = False
        if self.notification and re.fullmatch(r"Handle:\s+0x0014", clean):
            self.keyboard = True
        data = re.fullmatch(r"Data:\s*((?:[0-9a-fA-F]{2}\s*){8})", clean)
        if self.keyboard and data:
            self.keyboard = False
            # Classify activity only; do not return/store any usage/modifier bytes.
            return "KEYBOARD state: " + ("ACTIVE" if any(bytes.fromhex(data[1])) else "RELEASED")
        if ALLOWED.match(clean):
            return ADDRESS.sub("<address>", clean)
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--cue-test", action="store_true")
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    print(f"Metadata-only capture: {args.output}", flush=True)
    print("After authentication, follow the timed cues; tap A once at each cue. "
          "Avoid other keys until capture ends.", flush=True)
    stop = threading.Event()
    lock = threading.Lock()
    origin = None
    worker = None
    metadata = Metadata()
    with os.fdopen(fd, "w", buffering=1) as log:
        def emit(text):
            with lock:
                line = f"+{time.monotonic()-origin:.6f}s {text}"
                log.write(line + "\n")
                print(line, flush=True)

        def cues():
            if not stop.wait(2):
                emit("CUE WARM: tap A once now; then leave the keyboard untouched")
            if not stop.wait(28):
                emit("CUE IDLE: tap A once now; do not press a second time")

        try:
            for line in sys.stdin:
                if origin is None:
                    origin = time.monotonic()
                    if args.cue_test:
                        worker = threading.Thread(target=cues, daemon=True)
                        worker.start()
                result = metadata.feed(line)
                if result:
                    emit(result)
        except KeyboardInterrupt:
            pass
        finally:
            stop.set()
            if worker:
                worker.join()


if __name__ == "__main__":
    main()
