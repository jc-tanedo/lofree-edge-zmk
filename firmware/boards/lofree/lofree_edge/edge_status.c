/* SPDX-License-Identifier: MIT
 * Read-only board status, vendor HID feature7. Standard OTA reports unchanged.
 */
#include <errno.h>
#include <string.h>
#include <zephyr/device.h>
#include <zephyr/init.h>
#include <zephyr/irq.h>
#include <zephyr/sys/sys_io.h>
#include <zephyr/usb/class/usb_hid.h>
#include <zmk/hid_indicators.h>
#include "tlsr_slots.h"
#include "edge_lighting.h"
#include "edge_studio_io_diag.h"
#include <zephyr/sys/byteorder.h>

static struct hid_ops keyboard_ops, vendor_ops;
static const struct hid_ops *original_keyboard, *original_vendor;
static uint8_t led_count, led_length, led_id, led_mask, led_result;
static uint8_t descriptor[128], status[32];
static uint16_t stock_page;
static uint8_t stock_window[67];

#if IS_ENABLED(CONFIG_LOFREE_EDGE_SWITCH_DIAGNOSTICS)
static int edge_switch_inputs_init(void)
{
    /* Stock 0x9dfc: PD5-PD7 are GPIO inputs with outputs disabled.
     * Preserve other pins, output latches, and every pull configuration.
     * No mode decisions are made by this diagnostic build.
     */
    unsigned int key = irq_lock();
    sys_write8(sys_read8(0x0080059aU) | 0xe0, 0x0080059aU);
    sys_write8(sys_read8(0x0080059eU) | 0xe0, 0x0080059eU);
    sys_write8(sys_read8(0x00800599U) | 0xe0, 0x00800599U);
    irq_unlock(key);
    return 0;
}
SYS_INIT(edge_switch_inputs_init, APPLICATION, 90);
#endif
static const uint8_t feature_desc[] = {
#if IS_ENABLED(CONFIG_LOFREE_EDGE_STUDIO_IO_DIAGNOSTICS)
    0x06,0x00,0xff, 0x09,0x09, 0xa1,0x01, 0x85,0x09,
    0x15,0x00, 0x26,0xff,0x00, 0x75,0x08, 0x95,0x42,
    0x09,0x09, 0xb1,0x02, 0xc0,
#endif
    0x06,0x00,0xff, 0x09,0x07, 0xa1,0x01, 0x85,0x07,
    0x15,0x00, 0x26,0xff,0x00, 0x75,0x08, 0x95,0x1f,
    0x09,0x07, 0xb1,0x02, 0xc0,
    0x06,0x00,0xff, 0x09,0x08, 0xa1,0x01, 0x85,0x08,
    0x15,0x00, 0x26,0xff,0x00, 0x75,0x08, 0x95,0x42,
    0x09,0x08, 0xb1,0x02, 0xc0,
};

static int vendor_set(const struct device *dev, struct usb_setup_packet *setup,
                      int32_t *len, uint8_t **data)
{
    if (setup->wValue != 0x0308) {
        return original_vendor->set_report ? original_vendor->set_report(dev,setup,len,data)
                                           : -ENOTSUP;
    }
    if ((*len != 3 && *len != sizeof(stock_window)) || (*data)[0] != 8) { return -EINVAL; }
    uint16_t page = (*data)[1] | ((uint16_t)(*data)[2] << 8);
    if (page >= TLSR_SLOT_SIZE/64U) { return -EINVAL; }
    stock_page = page; /* RAM selector only. This feature cannot write flash. */
    return 0;
}

static int keyboard_set(const struct device *dev, struct usb_setup_packet *setup,
                         int32_t *len, uint8_t **data)
{
    /* Count LED-only reports, never capture ordinary input or feature data. */
    bool led = setup->wValue == 0x0201;
    if (led) {
        led_count++;
        led_length = *len;
        led_id = *len > 0 ? (*data)[0] : 0;
        led_mask = *len > 1 ? (*data)[1] : 0;
    }
    int rc = original_keyboard->set_report ? original_keyboard->set_report(dev, setup, len, data)
                                           : -ENOTSUP;
    if (led) { led_result = rc; }
    return rc;
}

static int vendor_get(const struct device *dev, struct usb_setup_packet *setup,
                      int32_t *len, uint8_t **data)
{
#if IS_ENABLED(CONFIG_LOFREE_EDGE_STUDIO_IO_DIAGNOSTICS)
    if (setup->wValue == 0x0309) {
        /* Reuse the existing67-byte feature scratch buffer; no extra RAM. */
        memset(stock_window, 0, sizeof(stock_window));
        stock_window[0]=9; stock_window[1]=2;
        for (unsigned int i=0; i<16; i++) {
            uint32_t value=i<12 ? edge_studio_io_counts[i] : edge_studio_io_runtime(i);
            sys_put_le32(value, &stock_window[3+i*4]);
        }
        *data=stock_window; *len=sizeof(stock_window);
        return 0;
    }
#endif
    if (setup->wValue == 0x0308) {
        stock_window[0]=8; stock_window[1]=stock_page; stock_window[2]=stock_page>>8;
        int rc = tlsr_slot_read(tlsr_slot_other()+((uint32_t)stock_page*64U),
                               &stock_window[3],64);
        if (rc) { return rc; }
        *data=stock_window; *len=sizeof(stock_window);
        return 0;
    }
    if (setup->wValue != 0x0307) {
        return original_vendor->get_report ? original_vendor->get_report(dev, setup, len, data)
                                           : -ENOTSUP;
    }
    memset(status, 0, sizeof(status));
    status[0]=7; status[1]='E'; status[2]='D'; status[3]=2;
    status[4]=led_count; status[5]=led_length; status[6]=led_id;
    status[7]=led_mask; status[8]=led_result;
    status[9]=zmk_hid_indicators_get_current_profile();
    status[10]=edge_caps_requested();
    const uint16_t registers[] = {0x58a,0x58b,0x58e,0x5ab,
                                 0x592,0x593,0x596,0x59a,0x59b,0x59e};
    for (int i=0; i<ARRAY_SIZE(registers); i++) {
        status[11+i]=sys_read8(0x00800000U+registers[i]);
    }
    status[21]=sys_read8(0x00800582U);
    status[22]=sys_read8(0x00800583U);
    status[23]=sys_read8(0x00800586U);
    /* Schema 2 appends fixed switch-input observations; bytes 0..23 retain
     * their original meaning. Never expose arbitrary register access.
     */
    status[24]=sys_read8(0x00800598U) & 0xe0;
    status[25]=sys_read8(0x00800599U) & 0xe0;
    status[26]=IS_ENABLED(CONFIG_LOFREE_EDGE_SWITCH_DIAGNOSTICS);
    *data=status; *len=sizeof(status);
    return 0;
}

void __real_usb_hid_register_device(const struct device *,const uint8_t *,size_t,
                                    const struct hid_ops *);
void __wrap_usb_hid_register_device(const struct device *dev,const uint8_t *desc,
                                    size_t size,const struct hid_ops *ops)
{
    if (!strcmp(dev->name,"HID_0")) {
        original_keyboard=ops;
        keyboard_ops=*ops;
        keyboard_ops.set_report=keyboard_set;
        ops=&keyboard_ops;
    } else if (!strcmp(dev->name,"HID_1") && size+sizeof(feature_desc)<=sizeof(descriptor)) {
        original_vendor=ops;
        vendor_ops=*ops;
        vendor_ops.get_report=vendor_get;
        vendor_ops.set_report=vendor_set;
        ops=&vendor_ops;
        memcpy(descriptor,desc,size);
        memcpy(descriptor+size,feature_desc,sizeof(feature_desc));
        desc=descriptor; size+=sizeof(feature_desc);
    }
    __real_usb_hid_register_device(dev,desc,size,ops);
}
