# SPDX-License-Identifier: GPL-3.0-or-later
import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('usbmeta',Path(__file__).resolve().parents[1]/'tools/filter_edge_studio_usbmon.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class UsbMetadata(unittest.TestCase):
 def test_scope_and_frame(self):
  m=module.Metadata((1,42));lines=[]
  for line in ['abcd1234 100 S Bo:1:42:5 -115 1 = ab','abcd1234 101 C Bo:1:42:5 0 1','bbbb9999 102 S Bo:1:42:5 -115 6 = 080b2202 0801','cccc8888 103 S Bo:1:42:5 -115 1 = ad']:
   lines+=m.feed(line)
  text='\n'.join(lines)
  self.assertIn('RPC request #11 subsystem=behaviors',text)
  self.assertNotIn('abcd1234',text);self.assertNotIn('1:42',text);self.assertNotIn('080b2202',text)
  self.assertEqual(m.feed('p 104 C Bi:1:42:3 0 8 = 00000400 00000000'),[])
  self.assertEqual(m.feed('p 104 C Bi:1:43:2 0 8 = 00000400 00000000'),[])
 def test_input_values_not_exposed(self):
  text='\n'.join(module.Metadata((1,42)).feed('ptr 100 C Bi:1:42:2 0 4 = 11223344'))
  self.assertIn('bytes=4 status=0',text);self.assertNotIn('11223344',text)
 def test_truncation_and_status(self):
  m=module.Metadata((1,42))
  self.assertIn('truncated',' '.join(m.feed('p 100 S Bo:1:42:5 -115 40 = ab080b')))
  self.assertIn('status=-32',' '.join(m.feed('p 101 C Bo:1:42:5 -32 0')))
if __name__=='__main__':unittest.main()
