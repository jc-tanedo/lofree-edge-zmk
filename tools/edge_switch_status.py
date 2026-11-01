"""Read fixed Edge switch-input status. Never writes GPIO, flash or keymaps."""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'src'))
from lofree_edge.board_status import decode_switch_status
from edge_ota import ota


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--position', choices=['ON', 'BT', 'OFF', 'unknown'],
                        default='unknown', help='Human-observed label; never inferred by this tool')
    parser.add_argument('--cable', choices=['connected', 'absent'], default='connected')
    args = parser.parse_args()
    hid = ota._hid_module()
    device, _ = ota.open_device(hid, 0x1d50, 0x615e, None, 'Lofree Edge ZMK')
    try:
        result = decode_switch_status(bytes(device.get_feature_report(7, 32)))
    finally:
        device.close()
    result['observed_position'] = args.position
    result['reported_cable'] = args.cable
    result['interpretation'] = 'Raw levels only; physical roles are not inferred by this tool.'
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
