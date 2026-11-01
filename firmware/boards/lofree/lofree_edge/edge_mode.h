/* SPDX-License-Identifier: GPL-3.0-or-later */
#pragma once
#include <stdbool.h>
#include <zephyr/sys/util.h>

enum edge_mode { EDGE_MODE_UNKNOWN, EDGE_MODE_ON, EDGE_MODE_BT, EDGE_MODE_OFF };
#if IS_ENABLED(CONFIG_LOFREE_EDGE_MODE_SWITCH)
enum edge_mode edge_mode_read(void);
enum edge_mode edge_mode_current(void);
void edge_mode_settled(enum edge_mode mode);
void edge_mode_prepare_restart(void);
bool edge_mode_allows_keys(void);
#else
static inline bool edge_mode_allows_keys(void) { return true; }
#endif
