/* SPDX-License-Identifier: GPL-3.0-or-later */
#include <assert.h>
#include "edge_power_policy.h"
int main(void) {
    struct edge_power_config c = EDGE_POWER_DEFAULTS;
    assert(edge_power_config_valid(&c));
    assert(edge_power_stage_at(&c,29999,false)==EDGE_POWER_ACTIVE);
    assert(edge_power_stage_at(&c,30000,false)==EDGE_POWER_DIM);
    assert(edge_power_stage_at(&c,120000,false)==EDGE_POWER_DARK);
    assert(edge_power_stage_at(&c,900000,true)==EDGE_POWER_ACTIVE);
    assert(edge_power_brightness(0,EDGE_POWER_DIM,20)==0);
    assert(edge_power_brightness(50,EDGE_POWER_DIM,20)==10);
    assert(edge_power_brightness(1,EDGE_POWER_DIM,20)<=1);
    assert(edge_power_brightness(50,EDGE_POWER_ACTIVE,20)==50);
    assert(edge_power_brightness(50,EDGE_POWER_DARK,20)==0);
    c.dim_seconds=c.off_seconds=c.sleep_seconds=0;
    assert(edge_power_config_valid(&c));
    assert(edge_power_stage_at(&c,0xffffffff,false)==EDGE_POWER_ACTIVE);
    assert(!edge_power_due(0xffffffff,0));
    c.off_seconds=2; c.dim_seconds=3; assert(!edge_power_config_valid(&c));
    c.dim_seconds=0; c.sleep_seconds=1; assert(!edge_power_config_valid(&c));
    c.sleep_seconds=86401; assert(!edge_power_config_valid(&c));
    c=(struct edge_power_config)EDGE_POWER_DEFAULTS; c.schema=2;
    assert(!edge_power_config_valid(&c));
    /* Millisecond wrap does not change a short elapsed interval. */
    assert(!edge_power_due((uint32_t)(50U-0xfffffff0U),30));
    return 0;
}
