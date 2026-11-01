"""Decode bounded Edge status snapshots; no transport or register writes."""


def decode_switch_status(packet: bytes) -> dict:
    if len(packet) != 32 or packet[:3] != b'\x07ED':
        raise ValueError('Unrecognized Edge board status report')
    schema = packet[3]
    if schema not in (1, 2):
        raise ValueError(f'Unsupported Edge board status schema {schema}')
    result = {'schema': schema, 'switch_diagnostics': False, 'switch_inputs': None}
    if schema == 1:
        return result  # Reserved v1 bytes are not input observations.
    result['switch_diagnostics'] = bool(packet[26])
    result['switch_inputs'] = {
        'pd_input': packet[24], 'pd_input_enable': packet[25],
        'pd_output_disable': packet[18], 'pd_gpio_function': packet[20],
        'pd5': bool(packet[24] & 0x20), 'pd6': bool(packet[24] & 0x40),
        'pd7': bool(packet[24] & 0x80),
    }
    return result
