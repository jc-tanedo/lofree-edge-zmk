/* SPDX-License-Identifier: GPL-3.0-or-later
 * Edge matrix wake wiring corroborated by stock 0xa124/0xa278/0xb050.
 * Original implementation using public TC32 suspend primitives.
 */
#include <zephyr/device.h>
#include <zephyr/devicetree.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/drivers/kscan.h>
#include <zephyr/drivers/timer/system_timer.h>
#include <zephyr/drivers/usb/usb_dc_b87.h>
#include <zephyr/irq.h>
#include <zephyr/kernel.h>
#include <zephyr/sys/sys_io.h>
#include <tlsr8278_suspend.h>
#include <tlsr_analog.h>
#include "edge_lighting.h"
#include "edge_power.h"
#include "edge_mode.h"
#define KSCAN DT_CHOSEN(zmk_kscan)
static const struct device *const scanner=DEVICE_DT_GET(KSCAN);
static const struct gpio_dt_spec cols[]={DT_FOREACH_PROP_ELEM_SEP(KSCAN,col_gpios,GPIO_DT_SPEC_GET_BY_IDX,(,))};
static const struct gpio_dt_spec rows[]={DT_FOREACH_PROP_ELEM_SEP(KSCAN,row_gpios,GPIO_DT_SPEC_GET_BY_IDX,(,))};
static const struct gpio_dt_spec selectors[]={GPIO_DT_SPEC_GET(DT_NODELABEL(edge_mode_switch),bt_gpios),
    GPIO_DT_SPEC_GET(DT_NODELABEL(edge_mode_switch),off_gpios)};
static bool asleep;
static uint8_t port_index(const struct gpio_dt_spec *p)
{
    /* GPIO devices' config is private: derive ports from their known identities. */
    if (p->port==DEVICE_DT_GET(DT_NODELABEL(gpioa))) { return 0; }
    if (p->port==DEVICE_DT_GET(DT_NODELABEL(gpiob))) { return 1; }
    if (p->port==DEVICE_DT_GET(DT_NODELABEL(gpioc))) { return 2; }
    return 3;
}
static void wake(const struct gpio_dt_spec *p,bool on)
{
    uint8_t bit=BIT(p->pin);
    tlsr8278_pad_wakeup(port_index(p),bit,gpio_pin_get_raw(p->port,p->pin)>0 ? bit : 0,on);
}
void key_matrix_sleep(bool sleep)
{
    if (asleep==sleep) { return; }
    asleep=sleep;
    if (sleep) {
        (void)kscan_disable_callback(scanner);
        edge_power_scan_sleep(true);
        edge_caps_scan_begin(); /* indicator gates inhibited before PB5 becomes a column */
        for (size_t i=0;i<ARRAY_SIZE(cols);i++) { gpio_pin_set_dt(&cols[i],1); }
        k_busy_wait(10);
        /* A press may arrive after the last scan but before pad arming.
         * Scan it now instead of arming for its release and losing the press. */
        for (size_t i=0;i<ARRAY_SIZE(rows);i++) {
            if (gpio_pin_get_dt(&rows[i])!=0) {
                asleep=false;
                for (size_t j=0;j<ARRAY_SIZE(cols);j++) { gpio_pin_set_dt(&cols[j],0); }
                edge_power_scan_sleep(false);
                edge_power_woke();
                (void)kscan_enable_callback(scanner);
                return;
            }
        }
    }
    unsigned int key=irq_lock();
    for (size_t i=0;i<ARRAY_SIZE(rows);i++) { wake(&rows[i],sleep); }
    for (size_t i=0;i<ARRAY_SIZE(selectors);i++) { wake(&selectors[i],sleep); }
    irq_unlock(key);
    if (!sleep) {
        for (size_t i=0;i<ARRAY_SIZE(cols);i++) { gpio_pin_set_dt(&cols[i],0); }
        edge_power_scan_sleep(false);
        (void)kscan_enable_callback(scanner);
    }
}
/* Called with interrupts locked just before a reboot-on-wake deep sleep.
 * Digital outputs are not retained there: use the stock columns' pulldowns.
 * Rows retain the board's existing pulls; hardware validation is required.
 */
void board_deep_sleep_pads(void)
{
    (void)kscan_disable_callback(scanner);
    edge_power_scan_sleep(true);
    edge_caps_scan_begin();
    for (size_t i=0;i<ARRAY_SIZE(cols);i++) {
        const struct gpio_dt_spec *p=&cols[i];
        uint8_t port=port_index(p),reg=0x0e + port*2+p->pin/4;
        uint8_t shift=2*(p->pin%4);
        tlsr_analog_write(reg,(tlsr_analog_read(reg)&~(3U<<shift))|(2U<<shift));
        gpio_pin_set_dt(p,1);
        uint32_t base=0x00800580U+8U*port;
        sys_write8(sys_read8(base+2)|BIT(p->pin),base+2);
    }
    k_busy_wait(50);
    for (size_t i=0;i<ARRAY_SIZE(rows);i++) { wake(&rows[i],edge_mode_current()==EDGE_MODE_BT); }
    for (size_t i=0;i<ARRAY_SIZE(selectors);i++) { wake(&selectors[i],true); }
}

/* USB host suspend is distinct from idle. Keep a timer fallback for hosts
 * whose core-resume signal does not wake the chip. No USB detach/reboot. */
uint32_t edge_usb_suspend_once(void)
{
    key_matrix_sleep(true);
    if (!edge_power_scan_asleep()) { return TLSR8278_WAKEUP_STATUS_PAD; }
    usb_dc_b87_chip_suspend(true);
    unsigned int key=irq_lock();
    uint8_t wake=sys_read8(0x0080006eU);
    sys_write8(wake|BIT(2),0x0080006eU);
    uint32_t status=tlsr8278_suspend(TLSR8278_WAKEUP_PAD|TLSR8278_WAKEUP_CORE|TLSR8278_WAKEUP_TIMER,
                                    k_cycle_get_32()+sys_clock_hw_cycles_per_sec());
    sys_write8(wake,0x0080006eU);
    sys_clock_set_timeout(0,false);
    irq_unlock(key);
    usb_dc_b87_chip_suspend(false);
    key_matrix_sleep(false);
    return status;
}
