/* SPDX-License-Identifier: GPL-3.0-or-later
 * Board-owned input/policy layer. Native BLE code owns debounce and restart.
 */
#include <zephyr/devicetree.h>
#include <zephyr/init.h>
#include <zephyr/irq.h>
#include <zephyr/kernel.h>
#include <zephyr/sys/atomic.h>
#include <zephyr/sys/sys_io.h>
#include <zmk/endpoints.h>
#include "edge_mode.h"
#include "edge_lighting.h"

/* TC32 native BLE extension; not declared in the generic ZMK header. */
extern void zmk_endpoints_reselect(void);

#define SELECTOR DT_NODELABEL(edge_mode_switch)
#define PORT DT_REG_ADDR(DT_GPIO_CTLR(SELECTOR, bt_gpios))
#define BT_BIT BIT(DT_GPIO_PIN(SELECTOR, bt_gpios))
#define OFF_BIT BIT(DT_GPIO_PIN(SELECTOR, off_gpios))
#define MASK (BT_BIT | OFF_BIT)
BUILD_ASSERT(PORT == 0x00800598U && BT_BIT == BIT(5) && OFF_BIT == BIT(6),
             "Review physical Edge evidence before changing selector wiring");
BUILD_ASSERT(DT_REG_ADDR(DT_GPIO_CTLR(SELECTOR, off_gpios)) == PORT);

static atomic_t active_mode;
static atomic_t quiescing;

static int mode_inputs_init(void)
{
    unsigned int key = irq_lock();
    sys_write8(sys_read8(PORT + 2) | MASK, PORT + 2); /* disable outputs first */
    sys_write8(sys_read8(PORT + 6) | MASK, PORT + 6);
    sys_write8(sys_read8(PORT + 1) | MASK, PORT + 1);
    irq_unlock(key);
    return 0;
}
SYS_INIT(mode_inputs_init, APPLICATION, 80);

enum edge_mode edge_mode_read(void)
{
    if ((sys_read8(PORT + 1) & MASK) != MASK ||
        (sys_read8(PORT + 2) & MASK) != MASK ||
        (sys_read8(PORT + 6) & MASK) != MASK) {
        return EDGE_MODE_UNKNOWN;
    }
    uint8_t levels = sys_read8(PORT);
    /* Stock prioritizes BT independently of PD6. Do not mistake both-low
     * (which may occur without cable power) for USB or an unsupported radio.
     */
    if (!(levels & BT_BIT)) { return EDGE_MODE_BT; }
    return levels & OFF_BIT ? EDGE_MODE_ON : EDGE_MODE_OFF;
}

enum edge_mode edge_mode_current(void)
{
    return atomic_get(&quiescing) ? EDGE_MODE_UNKNOWN : atomic_get(&active_mode);
}

bool edge_mode_allows_keys(void)
{
    enum edge_mode mode = edge_mode_current();
    return mode == EDGE_MODE_ON || mode == EDGE_MODE_BT;
}

void edge_mode_settled(enum edge_mode mode)
{
    atomic_set(&active_mode, mode);
    edge_lighting_mode_changed();
    zmk_endpoints_reselect();
}

/* USB control/Studio are gated by native USB startup. This second guard
 * suppresses HID reports even if some caller accidentally starts USB in BT.
 */
bool zmk_usb_reports_allowed(void) { return edge_mode_current() == EDGE_MODE_ON; }

void edge_mode_prepare_restart(void)
{
    zmk_endpoint_clear_reports(); /* best-effort release on the old endpoint */
    atomic_set(&quiescing, 1);
    zmk_endpoints_reselect(); /* also suppress already-scheduled behaviors */
    edge_lighting_mode_changed();
    /* Let the USB worker / radio drain releases. Link loss also clears host
     * state; this bounded wait is not a delivery guarantee to a lost host.
     */
    k_sleep(K_MSEC(100));
}
