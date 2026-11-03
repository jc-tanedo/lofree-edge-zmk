"""Stage hash-pinned native BLE sources with bounded connection-request counters.

Preserves original inputs. Appends counters to FF0C's BLE stats; no packet/key
payloads, flash addresses or new writes are introduced. RX window is extended
from720us to1200us for the completion-only DMA timing hypothesis.
"""
import hashlib
import re
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
out = Path(sys.argv[1])
base = root / '.deps/zmk-tc32/tc32/src/ble'

def read(name, digest):
    data = (base/name).read_bytes()
    assert hashlib.sha256(data).hexdigest() == digest, f'Review changed upstream {name}'
    return data.decode()

def replace(text, old, new):
    assert text.count(old) == 1, old
    return text.replace(old,new)

adv = read('ble_adv.c','f4163425ac4a49481cea02d05c4f78e4e605233cca988fb99fe839cd1522d2cd')
# A full CONNECT_IND can publish its DMA header later than a SCAN_REQ.
# Cover160us TX settling +376us ADV +150us IFS +352us request, with margin.
adv = replace(adv, '#define ADV_WINDOW      11520U', '#define ADV_WINDOW      19200U')
adv = replace(adv,'#define ADV_START_AHEAD', '''/* Edge diagnostic counters, metadata only; exposed by FF0C. */
uint32_t edge_adv_diag[12];
#define ADV_START_AHEAD''')
adv = replace(adv,'\tif (len != CONNECT_IND_LEN', '''\tedge_adv_diag[6] = sys_get_le32(e);
\tedge_adv_diag[7] = hdr | ((uint32_t)len << 8);
\tif (len != CONNECT_IND_LEN''')
adv = replace(adv,'''(e[TLSR_RADIO_RX_STATUS(len)] & BIT(0)) != 0U) {
		return false;''','''(e[TLSR_RADIO_RX_STATUS(len)] & BIT(0)) != 0U) {
		edge_adv_diag[2]++;
		return false;''')
adv = replace(adv,'''memcmp(&p[6], adv_addr, BLE_ADDR_LEN) != 0) {
		return false;''','''memcmp(&p[6], adv_addr, BLE_ADDR_LEN) != 0) {
		edge_adv_diag[3]++;
		return false;''')
adv = replace(adv,'\t\tcidoo_ble_stats.adv_refused++;','\t\tedge_adv_diag[4]++;\n\t\tcidoo_ble_stats.adv_refused++;')
adv = replace(adv,'\treturn req->interval >= 6U', '''\tedge_adv_diag[8] = req->win_size | ((uint32_t)req->win_offset << 8);
\tedge_adv_diag[9] = req->interval | ((uint32_t)req->latency << 16);
\tedge_adv_diag[10] = req->timeout | ((uint32_t)req->hop << 16);
\tedge_adv_diag[11] = req->chm[4] | ((uint32_t)used << 8);
\tbool valid = req->interval >= 6U''')
adv = replace(adv,'''req->aa != TLSR_BLE_ADV_ACCESS_ADDRESS;
}''','''req->aa != TLSR_BLE_ADV_ACCESS_ADDRESS;
	if (!valid) { edge_adv_diag[5]++; }
	return valid;
}''')
adv = replace(adv,'''\t\ttlsr_radio_irq_restore(irq_en);

		while ((tlsr_radio_irq_status() & TLSR_RF_IRQ_RX)''','''\t\tif ((rx[TLSR_RADIO_DMA_HDR] & 0x0fU) == PDU_CONNECT_IND) {
			edge_adv_diag[0]++;
		}
		tlsr_radio_irq_restore(irq_en);

		while ((tlsr_radio_irq_status() & TLSR_RF_IRQ_RX)''')
adv = replace(adv,'''\t\t\tfound = connect_ind(rx, t_end, req);
		}''','''\t\t\tfound = connect_ind(rx, t_end, req);
		} else {
			edge_adv_diag[1]++;
		}''')
ble = read('ble.c','7a33ff892ec07aea83ec12e62ed78a24510c8eab33efc7587de45619f3cff825')
ble = replace(ble,'size_t ble_link_stats_read(', 'extern uint32_t edge_adv_diag[12];\nsize_t ble_link_stats_read(')
ble = replace(ble,'(uint16_t)sizeof(cidoo_ble_stats)', '(uint16_t)(sizeof(cidoo_ble_stats) + sizeof(edge_adv_diag))')
ble = replace(ble,'''{(const uint8_t *)&cidoo_ble_stats, sizeof(cidoo_ble_stats)},''','''{(const uint8_t *)&cidoo_ble_stats, sizeof(cidoo_ble_stats)},
		     {(const uint8_t *)edge_adv_diag, sizeof(edge_adv_diag)},''')
def relocate(text):
    # Preserve quote-include lookup relative to the original source, without
    # adding its directory globally (its analog wrapper uses an angle include).
    return re.sub(r'#include "([^"]+)"', lambda m:
        '#include "' + str(base/m[1]) + '"' if (base/m[1]).exists() else m[0], text)
(out/'edge_ble_adv.c').write_text(relocate(adv))
from stage_edge_mode import patch_ble
from stage_edge_power import patch_ble as patch_power_ble
(out/'edge_ble.c').write_text(relocate(patch_power_ble(patch_ble(ble))))
