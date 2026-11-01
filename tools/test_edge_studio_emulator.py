"""Exercise the actual Studio protobuf/CDC path and persistent map in compiled TC32."""
import os
from pathlib import Path
import runpy
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault('EDGE_TEST_BUILD', 'lofree_edge-studio')
generated = ROOT / 'build/tmp/studio-python-proto'
generated.mkdir(exist_ok=True)
proto = ROOT / '.deps/zmk-studio-messages/proto/zmk'
subprocess.run(['protoc', f'--proto_path={proto}', f'--python_out={generated}',
                *map(str, proto.glob('*.proto'))], check=True)
sys.path.insert(0, str(generated))
import studio_pb2 as pb

state = runpy.run_path(str(ROOT / 'tools/test_edge_lighting_emulator.py'))
m, u, advance = (state[name] for name in ('m', 'u', 'advance'))
interfaces = state['interfaces']
cdc_control = next(entry for entry in interfaces if entry['klass'] == 2)
cdc_data = next(entry for entry in interfaces if entry['klass'] == 10)
cdc_in = next(ep & 127 for ep in cdc_data['endpoints'] if ep & 128)
cdc_out = next(ep for ep in cdc_data['endpoints'] if not ep & 128)
notify = cdc_control['endpoints'][0] & 127

def activate_serial():
    # Browser serial.open() line coding and DTR, as seen by the real CDC class.
    u.control(bytes([0x21,0x20,0,0,cdc_control['number'],0,7,0]),
              out=(12500).to_bytes(4,'little') + bytes([0,0,8]))
    u.control(bytes([0x21,0x22,1,0,cdc_control['number'],0,0,0]))
    advance(20)

pending = bytearray()
escaped = False
responses = []
request_id = 0

def tick():
    global escaped
    advance(1)
    u.in_ep(notify)
    packet = u.in_ep(cdc_in)
    if packet is None:
        return
    for byte in packet:
        if escaped:
            pending.append(byte)
            escaped = False
        elif byte == 0xac:
            escaped = True
        elif byte == 0xab:
            pending.clear()
        elif byte == 0xad:
            response = pb.Response()
            response.ParseFromString(pending)
            responses.append(response)
            pending.clear()
        else:
            pending.append(byte)

def rpc(request):
    global request_id
    request_id += 1
    request.request_id = request_id
    print(f'RPC {request_id}: {request.WhichOneof("subsystem")} request', flush=True)
    frame = bytearray([0xab])
    for byte in request.SerializeToString():
        if byte in (0xab,0xac,0xad):
            frame.append(0xac)
        frame.append(byte)
    frame.append(0xad)
    for offset in range(0, len(frame), 32):
        for _ in range(100):
            if u.out_ep(cdc_out, frame[offset:offset+32]):
                break
            tick()
        else:
            raise AssertionError('CDC OUT endpoint never armed')
        tick()
    for tick_index in range(500):
        for response in responses:
            if response.HasField('request_response') and response.request_response.request_id == request_id:
                responses.remove(response)
                print(f'RPC {request_id}: response in {tick_index}ms', flush=True)
                return response.request_response
        tick()
    raise AssertionError(f'No Studio response for {request}')

def unlock():
    state['pressed'].add((5,10))
    advance(20)
    state['pressed'].add((2,7))  # U: stock slot37
    advance(30)
    state['pressed'].clear()
    advance(30)
    request = pb.Request()
    request.core.get_lock_state = True
    assert rpc(request).core.get_lock_state == 1, 'Fn+U failed to unlock Studio'

def keymap():
    request = pb.Request()
    request.keymap.get_keymap = True
    response = rpc(request)
    assert response.WhichOneof('subsystem') == 'keymap', response
    return response.keymap.get_keymap

activate_serial()
request = pb.Request()
request.core.get_device_info = True
assert rpc(request).core.get_device_info.name == 'Lofree Edge ZMK'
request = pb.Request()
request.keymap.get_keymap = True
assert rpc(request).meta.simple_error == 1, 'Editing channel not initially locked'
unlock()
current = keymap()
assert len(current.layers) == 2 and current.available_layers == 1
assert [layer.name for layer in current.layers] == ['Base','Fn']
assert all(len(layer.bindings) == 84 for layer in current.layers)
request = pb.Request()
request.keymap.get_physical_layouts = True
physical = rpc(request).keymap.get_physical_layouts
assert len(physical.layouts) == 1 and len(physical.layouts[0].keys) == 84
print('PASS: real CDC/protobuf info, initial lock, Fn+U unlock, 84-key geometry and keymap reads')

request = pb.Request()
request.behaviors.list_all_behaviors = True
behavior_ids = rpc(request).behaviors.list_all_behaviors.behaviors
assert len(behavior_ids) == len(set(behavior_ids)), 'Behavior ID collision'
names = []
behavior_details = {}
for behavior_id in behavior_ids:
    request = pb.Request()
    request.behaviors.get_behavior_details.behavior_id = behavior_id
    response = rpc(request)
    assert response.WhichOneof('subsystem') == 'behaviors', response
    details = response.behaviors.get_behavior_details
    behavior_details[behavior_id] = details
    assert details.id == behavior_id
    names.append(details.display_name)
assert 'Key Press' in names and 'Momentary Layer' in names
print(f'PASS: official editor can enumerate all {len(behavior_ids)} behavior IDs and metadata')

# Caps -> momentary Fn, using the behavior ID read from the actual Fn binding.
request = pb.Request()
request.keymap.set_layer_binding.layer_id = 0
request.keymap.set_layer_binding.key_position = 45
request.keymap.set_layer_binding.binding.CopyFrom(current.layers[0].bindings[79])
assert rpc(request).keymap.set_layer_binding == 0
request = pb.Request()
request.keymap.add_layer.SetInParent()
added = rpc(request).keymap.add_layer
assert added.WhichOneof('result') == 'ok' and added.ok.layer.id == 2
request = pb.Request()
request.keymap.set_layer_props.layer_id = 2
request.keymap.set_layer_props.name = 'Custom'
assert rpc(request).keymap.set_layer_props == 0
request = pb.Request()
request.keymap.save_changes = True
assert rpc(request).keymap.save_changes.ok
assert state['flash'].mem[8:12] == bytes(4), 'Settings touched retained stock flag'
print('PASS: Caps -> Fn, enable/rename spare layer, save through the actual flash backend')

m.reset()
assert m.boot_slot == 0x20000
assert u.run_until(u.dp_pullup, 1000)
u.bus_reset()
u.control(bytes([0,5,1,0,0,0,0,0]))
u.control(bytes([0,9,1,0,0,0,0,0]))
activate_serial()
unlock()
reloaded = keymap()
assert len(reloaded.layers) == 3 and reloaded.layers[2].name == 'Custom'
assert reloaded.layers[0].bindings[45] == reloaded.layers[0].bindings[79]
print('PASS: mappings and layer state read back from keyboard flash after a full reset')
