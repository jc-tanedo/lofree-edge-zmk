# SPDX-License-Identifier: GPL-3.0-or-later
import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('probe',Path(__file__).resolve().parents[1]/'tools/probe_edge_studio_reads.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class Probe(unittest.TestCase):
 def test_chunk_modes_preserve_bytes(self):
  payload=bytes([8,11,34,0xab,0xac,0xad,1]);split=module.chunks(payload,'fragmented');whole=module.chunks(payload,'coalesced')
  self.assertEqual(b''.join(split),whole[0]);self.assertGreater(len(split),1);self.assertEqual(len(whole),1)
  decoder=module.Frames();frames=[]
  for chunk in split:frames+=decoder.feed(chunk)
  self.assertEqual(frames,[payload])
 def test_frame_limit(self):
  with self.assertRaises(RuntimeError):module.Frames().feed(b'\xab'+b'x'*65537)
 def test_only_read_operations(self):
  class Group:
   def WhichOneof(self,name):return 'set_layer_binding'
  class Request:
   keymap=Group()
   def WhichOneof(self,name):return 'keymap'
  with self.assertRaises(ValueError):module.allowed(Request())
if __name__=='__main__':unittest.main()
