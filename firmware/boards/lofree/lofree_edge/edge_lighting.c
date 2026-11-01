/* SPDX-License-Identifier: MIT
 * Edge register wiring recovered from stock V0116; see lighting-evidence.md.
 */
#include <errno.h>
#include <zephyr/device.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/drivers/led.h>
#include <zephyr/init.h>
#include <zephyr/irq.h>
#include <zephyr/sys/atomic.h>
#include <zephyr/sys/sys_io.h>
#include <zmk/event_manager.h>
#include <zmk/events/hid_indicators_changed.h>
#include <zmk/hid_indicators.h>
#include "edge_lighting.h"
#include "edge_mode.h"
#include "edge_power.h"

BUILD_ASSERT(IS_ENABLED(CONFIG_ZMK_KSCAN_MATRIX_POLLING),
             "Shared Caps column needs polling and the scan-boundary hooks");
static const struct gpio_dt_spec caps = GPIO_DT_SPEC_GET_BY_IDX(DT_NODELABEL(kscan0),
                                                               col_gpios, 0);
static const struct gpio_dt_spec caps_source = GPIO_DT_SPEC_GET(DT_NODELABEL(kscan0),
                                                               caps_source_gpios);
static const struct gpio_dt_spec indicator_power = GPIO_DT_SPEC_GET(DT_NODELABEL(kscan0),
                                                                   indicator_power_gpios);
static const struct gpio_dt_spec indicator_enable = GPIO_DT_SPEC_GET(DT_NODELABEL(kscan0),
                                                                    indicator_enable_gpios);
BUILD_ASSERT(DT_GPIO_PIN_BY_IDX(DT_NODELABEL(kscan0), col_gpios, 0) == 5,
             "Review shared PB5 indicator if matrix order changes");
static atomic_t caps_on;
bool edge_caps_requested(void) { return atomic_get(&caps_on) != 0; }

/* The lit combination is PC1 low/PA7 high. Earlier PC1 high/PA7 low trials
 * left the indicator dark with typing/backlight working. Inhibit both during
 * matrix reads: PB5's ordinary column pulses otherwise leave an off-state glow.
 * USB events only change the desired state; the scan worker owns all pins. */
static void caps_gate(bool on)
{
    if (on) {
        gpio_pin_set_dt(&caps_source, 0);
        gpio_pin_set_dt(&indicator_enable, 1);
    } else {
        gpio_pin_set_dt(&indicator_enable, 0);
        gpio_pin_set_dt(&caps_source, 1);
    }
}
void edge_caps_scan_begin(void)
{
    caps_gate(false);
    gpio_pin_set_dt(&caps, 0);
}
void edge_caps_scan_end(void)
{
    bool on = edge_mode_allows_keys() && edge_power_indicators_allowed() && atomic_get(&caps_on) != 0;
    gpio_pin_set_dt(&caps, on);
    caps_gate(on);
}

static int caps_event(const zmk_event_t *event)
{
    const struct zmk_hid_indicators_changed *ev = as_zmk_hid_indicators_changed(event);
    if (ev) {
        atomic_set(&caps_on, (ev->indicators & BIT(1)) != 0);
    }
    return ZMK_EV_EVENT_BUBBLE;
}
ZMK_LISTENER(edge_caps, caps_event);
ZMK_SUBSCRIPTION(edge_caps, zmk_hid_indicators_changed);

/* PWM4 is exclusive to PB4; preserve every other GPIO/PWM channel bit. */
#define REG(off) (0x00800000U + (off))
#define PB_OEN 0x58aU
#define PB_OUT 0x58bU
#define PB_GPIO 0x58eU
#define PB_MUX_H 0x5abU
#define PWM_EN 0x780U
#define PWM_CLK 0x782U
#define PWM_INV 0x784U
#define PWM4_CMP 0x7a4U
#define PWM4_MAX 0x7a6U
#define LIGHT BIT(4)

static void bits(uint32_t offset, uint8_t mask, uint8_t value)
{
    sys_write8((sys_read8(REG(offset)) & (uint8_t)~mask) | (value & mask), REG(offset));
}

static int apply_brightness(uint8_t value)
{
    unsigned int key = irq_lock();
    bits(PWM_EN, LIGHT, 0);
    if (value == 0) {
        /* Stock's off state: GPIO PB4 output low, PWM4 stopped. */
        bits(PB_OUT, LIGHT, 0);
        bits(PB_GPIO, LIGHT, LIGHT);
        bits(PB_OEN, LIGHT, 0);
    } else {
        /* Stock9938: PWM4N function1, 1MHz clock, period255, inverted. */
        sys_write8(47, REG(PWM_CLK));
        sys_write16(255, REG(PWM4_MAX));
        sys_write16(255 - (value * 255U / 100U), REG(PWM4_CMP));
        bits(PWM_INV, LIGHT, LIGHT);
        bits(PB_MUX_H, 3, 1);
        bits(PB_OEN, LIGHT, 0);
        bits(PB_GPIO, LIGHT, 0);
        bits(PWM_EN, LIGHT, LIGHT);
    }
    irq_unlock(key);
    return 0;
}

#if IS_ENABLED(CONFIG_LOFREE_EDGE_MODE_SWITCH)
static uint8_t requested_brightness;
#endif
static int set_brightness(const struct device *dev, uint32_t led, uint8_t value)
{
    ARG_UNUSED(dev);
    if (led != 0 || value > 100) { return -EINVAL; }
#if IS_ENABLED(CONFIG_LOFREE_EDGE_MODE_SWITCH)
    requested_brightness = value;
#endif
    return apply_brightness(edge_mode_allows_keys() ? edge_power_effective_brightness(value) : 0);
}

void edge_lighting_mode_changed(void)
{
#if IS_ENABLED(CONFIG_LOFREE_EDGE_MODE_SWITCH)
    apply_brightness(edge_mode_allows_keys() ? edge_power_effective_brightness(requested_brightness) : 0);
    if (!edge_mode_allows_keys()) { caps_gate(false); }
#endif
}

static int light_on(const struct device *dev, uint32_t led) { return set_brightness(dev, led, 100); }
static int light_off(const struct device *dev, uint32_t led) { return set_brightness(dev, led, 0); }
static int light_init(const struct device *dev)
{
    /* Start with the indicator inhibited; the scan worker enables the
     * physically working PC1-low/PA7-high state only when Caps is requested. */
    if (!device_is_ready(caps_source.port)) { return -ENODEV; }
    int err = gpio_pin_configure_dt(&caps_source, GPIO_OUTPUT_ACTIVE);
    if (err) { return err; }
    if (!device_is_ready(indicator_power.port)) { return -ENODEV; }
    err = gpio_pin_configure_dt(&indicator_power, GPIO_OUTPUT_ACTIVE);
    if (err) { return err; }
    if (!device_is_ready(indicator_enable.port)) { return -ENODEV; }
    err = gpio_pin_configure_dt(&indicator_enable, GPIO_OUTPUT_INACTIVE);
    if (err) { return err; }
    return set_brightness(dev, 0, 0);
}
static const struct led_driver_api light_api = {
    .on = light_on, .off = light_off, .set_brightness = set_brightness,
};
DEVICE_DT_DEFINE(DT_NODELABEL(edge_backlight), light_init, NULL, NULL, NULL,
                 POST_KERNEL, CONFIG_LED_INIT_PRIORITY, &light_api);
