/* SPDX-License-Identifier: GPL-3.0-or-later */
#pragma once
#include <stdint.h>
#if IS_ENABLED(CONFIG_LOFREE_EDGE_STUDIO_IO_DIAGNOSTICS)
extern volatile uint32_t edge_studio_io_counts[12];
#define EDGE_IO_ADD(index, value) (edge_studio_io_counts[index] += (uint32_t)(value))
#define EDGE_IO_SET(index, value) (edge_studio_io_counts[index] = (uint32_t)(value))
uint32_t edge_studio_io_runtime(unsigned int index);
#else
#define EDGE_IO_ADD(index, value) do { } while (0)
#define EDGE_IO_SET(index, value) do { } while (0)
#endif
