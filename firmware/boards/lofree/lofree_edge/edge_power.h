/* SPDX-License-Identifier: GPL-3.0-or-later */
#pragma once
#include "edge_power_policy.h"
#include <zephyr/sys/util.h>
#if IS_ENABLED(CONFIG_LOFREE_EDGE_MODE_SWITCH)
uint8_t edge_power_effective_brightness(uint8_t requested);
bool edge_power_sleep_due(void);
bool edge_power_indicators_allowed(void);
uint32_t edge_usb_suspend_once(void);
void edge_power_woke(void);
void edge_power_scan_sleep(bool asleep);
bool edge_power_scan_asleep(void);

#else
static inline bool edge_power_indicators_allowed(void) { return true; }
static inline uint8_t edge_power_effective_brightness(uint8_t requested) { return requested; }
#endif
