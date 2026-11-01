/* SPDX-License-Identifier: GPL-3.0-or-later */
#pragma once
#include <stdbool.h>
#include <stdint.h>

/* Seconds from the last physical activity. Zero means Never. */
#define EDGE_POWER_SCHEMA 1U
#define EDGE_POWER_MAX_SECONDS 86400U
struct edge_power_config {
    uint32_t schema, dim_seconds, off_seconds, sleep_seconds, dim_percent;
};
#define EDGE_POWER_DEFAULTS {EDGE_POWER_SCHEMA, 30, 120, 900, 20}

enum edge_power_stage { EDGE_POWER_ACTIVE, EDGE_POWER_DIM, EDGE_POWER_DARK };
static inline bool edge_power_config_valid(const struct edge_power_config *c)
{
    return c->schema == EDGE_POWER_SCHEMA && c->dim_percent <= 100 &&
        c->dim_seconds <= EDGE_POWER_MAX_SECONDS &&
        c->off_seconds <= EDGE_POWER_MAX_SECONDS &&
        c->sleep_seconds <= EDGE_POWER_MAX_SECONDS &&
        (!c->dim_seconds || !c->off_seconds || c->dim_seconds <= c->off_seconds) &&
        (!c->dim_seconds || !c->sleep_seconds || c->dim_seconds <= c->sleep_seconds) &&
        (!c->off_seconds || !c->sleep_seconds || c->off_seconds <= c->sleep_seconds);
}
static inline bool edge_power_due(uint32_t elapsed_ms, uint32_t seconds)
{
    return seconds && elapsed_ms >= seconds * 1000U;
}
static inline enum edge_power_stage edge_power_stage_at(const struct edge_power_config *c,
                                                        uint32_t elapsed_ms, bool held)
{
    if (held) { return EDGE_POWER_ACTIVE; }
    if (edge_power_due(elapsed_ms, c->off_seconds)) { return EDGE_POWER_DARK; }
    if (edge_power_due(elapsed_ms, c->dim_seconds)) { return EDGE_POWER_DIM; }
    return EDGE_POWER_ACTIVE;
}
static inline uint8_t edge_power_brightness(uint8_t requested, enum edge_power_stage stage,
                                            uint32_t percent)
{
    if (stage == EDGE_POWER_DARK) { return 0; }
    return stage == EDGE_POWER_DIM ? (requested * percent / 100U) : requested;
}
