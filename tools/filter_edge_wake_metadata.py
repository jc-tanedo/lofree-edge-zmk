# SPDX-License-Identifier: GPL-3.0-or-later
"""Filter btmon stdin to timing/protocol metadata; never retain HID payloads or keys.

No device commands are sent. Choose a private --output path outside the public
repository. Run the capture on the actual Bluetooth host, not a USB-only bridge.
"""
import argparse
import os
from pathlib import Path
import re
import sys

ALLOWED = re.compile(
    r"^(?:[<>] (?:HCI (?:Event|Command)|ACL Data (?:RX|TX))\b|"
    r"(?:ATT|L2CAP):|LE (?:Enhanced )?Connection Complete\b|"
    r"LE Connection Update Complete\b|"
    r"(?:Status|Reason|Handle|Connection handle|Connection interval|"
    r"Connection latency|Supervision timeout|TX PHY|RX PHY):)"
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    print(f"Metadata-only capture: {args.output}", flush=True)
    print("After sudo authentication, wait 30s; tap A once, wait 2s, tap A again. "
          "Do not press other keys until the capture ends.", flush=True)
    try:
        with os.fdopen(fd, "w", buffering=1) as log:
            for line in sys.stdin:
                clean = re.sub(r"\x1b\[[0-9;]*m", "", line).strip()
                if ALLOWED.match(clean):
                    log.write(clean + "\n")
                    print(clean, flush=True)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
