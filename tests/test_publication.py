"""Publication gates must reject unsafe bundles and untested releases."""
import importlib.util,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from audit_publication import check
from verify_promotion import validate_metadata,CASES
class PublicationTests(unittest.TestCase):
 def test_private_inputs_and_credentials_are_rejected(self):
  for name,data in [('private/input.txt',b'x'),('app.exe',b'MZ'),('capture.pcap',b'x'),('ok.txt',b'github_pat_'+b'a'*35)]:
   with self.subTest(name=name),self.assertRaises(ValueError):check(name,data)
 def test_archive_traversal_is_rejected(self):
  with self.assertRaises(ValueError):check('../escape',b'x','archive')
 def test_qa_is_not_publishable(self):
  with self.assertRaises(ValueError):check('studio-qa/index.html',b'x','site')
 def test_firmware_is_not_source(self):
  with self.assertRaises(ValueError):check('stock.bin',b'x')
 def metadata(self):
  v=(ROOT/'VERSION').read_text().strip();sha='a'*64
  release={'isDraft':False,'body':sha+'\n'+'\n'.join('- [x] hardware:'+case for case in CASES)}
  provenance={'dirty':False,'version':v,'site_base':'/lofree-edge-zmk','commit':'abc','firmware_sha256':sha}
  return v,'v'+v,release,provenance,'abc'
 def test_complete_hardware_evidence_passes(self):validate_metadata(*self.metadata())
 def test_unchecked_hardware_blocks_promotion(self):
  args=list(self.metadata());args[2]['body']=args[2]['body'].replace('[x]','[ ]',1)
  with self.assertRaisesRegex(ValueError,'Missing hardware'):validate_metadata(*args)
 def test_missing_switch_hardware_evidence_blocks_promotion(self):
  for case in ('switch-mode-routing','switch-cable-battery','legacy-output-immunity'):
   with self.subTest(case=case):
    args=list(self.metadata())
    args[2]['body']=args[2]['body'].replace('- [x] hardware:'+case,'')
    with self.assertRaisesRegex(ValueError,'Missing hardware check: '+case):validate_metadata(*args)
 def test_missing_power_hardware_evidence_blocks_promotion(self):
  for case in ('power-settings-persistence','idle-dim-off','ble-suspend-wake','ble-deep-wake','off-selector-wake','usb-host-suspend','power-current-measurements'):
   with self.subTest(case=case):
    args=list(self.metadata())
    args[2]['body']=args[2]['body'].replace('- [x] hardware:'+case,'')
    with self.assertRaisesRegex(ValueError,'Missing hardware check: '+case):validate_metadata(*args)
 def test_draft_or_wrong_commit_cannot_deploy(self):
  args=list(self.metadata());args[2]['isDraft']=True
  with self.assertRaises(ValueError):validate_metadata(*args)
  args=list(self.metadata());args[3]['commit']='different'
  with self.assertRaises(ValueError):validate_metadata(*args)
 def test_canonical_version_and_risk_ack_are_present(self):
  from lofree_edge._version import __version__
  self.assertEqual(__version__,(ROOT/'VERSION').read_text().strip())
  html=(ROOT/'web/dist/index.html').read_text()
  self.assertIn('id="firmware-risk-ack" required',html)
  self.assertIn('formnovalidate',html)
  self.assertIn('<edge-risk-notice>',html)
if __name__=='__main__':unittest.main()
