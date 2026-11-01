"""CLI for discovery and one bounded configuration read."""

from ._version import __version__
import argparse
import json

from .protocol import build_read_request, parse_read_response
from .transport import discover, exchange_read


def main():
    parser = argparse.ArgumentParser(description=__doc__ + " EXPERIMENTAL: firmware, website, tools and instructions are used entirely at your own risk. No warranty; recovery is not guaranteed.")
    parser.add_argument("--version", action="version", version=__version__)
    subcommands = parser.add_subparsers(dest="command", required=True)
    subcommands.add_parser("info", help="Discover the wired vendor interface without sending reports")
    for name in ("packet", "read"):
        command = subcommands.add_parser(name, help="Build a request" if name == "packet" else "Send a configuration-read request")
        command.add_argument("--offset", type=lambda value: int(value, 0), default=0)
        command.add_argument("--length", type=int, default=1)
        command.add_argument("--space", choices=("configuration", "capabilities", "matrix", "secondary"), default="configuration")
    args = parser.parse_args()
    if args.command == "info":
        print(json.dumps({"devices": discover()}, indent=2))
        return 0
    opcode = {"configuration": 5, "capabilities": 3, "matrix": 7, "secondary": 0x1B}[args.space]
    result = {"offset": args.offset, "length": args.length, "space": args.space}
    try:
        request = build_read_request(args.offset, args.length, opcode)
        result["request_hex"] = request.hex()
        if args.command == "read":
            response = exchange_read(request)
            result["response_hex"] = response.hex()
            result["data_hex"] = parse_read_response(response, args.offset, args.length, opcode).hex()
    except (OSError, ValueError) as error:
        result["error"] = str(error)
        print(json.dumps(result, indent=2))
        return 1
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
