/* SPDX-License-Identifier: GPL-3.0-or-later */
#include <zephyr/kernel.h>
#include "edge_studio_io_diag.h"
/* Each field has one writer; aligned32-bit reads expose counts/sequence only.
 * No payload/key/bond/address data, flash writes or reset command. */
volatile uint32_t edge_studio_io_counts[12];
