# SPDX-License-Identifier: GPL-3.0-or-later
import importlib.util
from pathlib import Path
import struct
import unittest
spec=importlib.util.spec_from_file_location('iodiag',Path(__file__).resolve().parents[1]/'tools/read_edge_studio_io_diag.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class IoDiag(unittest.TestCase):
 def test_fixed_metadata_schema(self):
  result=module.parse(bytes([9,1,0])+struct.pack('<16I',*range(16)))
  self.assertEqual(result['last_request_id'],5);self.assertEqual(result['rx_ring_used'],12)
  self.assertEqual(set(result),set(module.FIELDS))
 def test_rejects_incomplete_and_wrong_feature(self):
  for data in (b'',bytes(67),bytes([8,1,0])+bytes(64)):
   with self.assertRaises(ValueError):module.parse(data)
if __name__=='__main__':unittest.main()
