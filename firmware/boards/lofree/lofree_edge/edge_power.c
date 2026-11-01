/* SPDX-License-Identifier: GPL-3.0-or-later */
#include <errno.h>
#include <string.h>
#include <zephyr/init.h>
#include <zephyr/irq.h>
#include <zephyr/kernel.h>
#include <zephyr/settings/settings.h>
#include <zephyr/sys/atomic.h>
#include <zephyr/sys/byteorder.h>
#include <zephyr/sys/crc.h>
#include <zmk/event_manager.h>
#include <zmk/events/position_state_changed.h>
#include <zmk/events/keycode_state_changed.h>
#include <zmk/hid.h>
#include <zmk/usb.h>
#include <zephyr/drivers/usb/usb_dc.h>
#include "edge_power.h"
#include "edge_lighting.h"
#include "edge_mode.h"

static struct edge_power_config config = EDGE_POWER_DEFAULTS;
static int64_t last_activity;
static uint32_t held[4];
static bool sleeping, future_schema, host_suspended;
static int64_t host_suspended_since;
static int64_t last_host_wake;
#if IS_ENABLED(CONFIG_SOC_TLSR8278_SUSPEND)
#include <tlsr8278_suspend.h>
extern void ble_deep_sleep(void);
#endif
static atomic_t writing;
static enum edge_power_stage light_stage;
/* All settings fit in one value in the pinned TLSR settings log. CRC covers the version and values. */
#define RECORD_SIZE 24U
static void encode_record(const struct edge_power_config *c, uint8_t out[RECORD_SIZE])
{
    const uint32_t values[] = {c->schema,c->dim_seconds,c->off_seconds,c->sleep_seconds,c->dim_percent};
    for (int i=0;i<5;i++) { sys_put_le32(values[i],out+4*i); }
    sys_put_le32(crc32_ieee(out,20),out+20);
}
static int load(const char *name, size_t len, settings_read_cb read_cb, void *arg)
{
    if (strcmp(name,"config")) { return -ENOENT; }
    uint8_t record[RECORD_SIZE];
    if (len != sizeof(record) || read_cb(arg,record,sizeof(record)) != sizeof(record)) { return 0; }
    if (crc32_ieee(record,20) != sys_get_le32(record+20)) { return 0; }
    struct edge_power_config c = {sys_get_le32(record),sys_get_le32(record+4),
        sys_get_le32(record+8),sys_get_le32(record+12),sys_get_le32(record+16)};
    if (c.schema > EDGE_POWER_SCHEMA) { future_schema=true; return 0; }
    if (!edge_power_config_valid(&c)) { return 0; }
    config=c;
    return 0;
}
SETTINGS_STATIC_HANDLER_DEFINE(edge_power,"edge_power",NULL,load,NULL,NULL);

static bool keys_held(void)
{
    return (held[0]|held[1]|held[2]|held[3]) != 0;
}
uint8_t edge_power_effective_brightness(uint8_t requested)
{
    unsigned int key=irq_lock();
    uint8_t value=(sleeping || host_suspended) ? 0 : edge_power_brightness(requested,light_stage,config.dim_percent);
    irq_unlock(key);
    return value;
}
bool edge_power_scan_asleep(void) { return sleeping; }
bool edge_power_indicators_allowed(void) { return !sleeping && !host_suspended; }
void edge_power_scan_sleep(bool asleep)
{
    sleeping=asleep;
    edge_lighting_mode_changed();
}
void edge_power_woke(void)
{
    unsigned int key=irq_lock();
    last_activity=k_uptime_get();
    light_stage=EDGE_POWER_ACTIVE;
    irq_unlock(key);
    edge_lighting_mode_changed();
}
/* Queue hook is staged from pinned upstream. */
extern bool edge_behavior_queue_busy(void);
static bool report_nonzero(const void *data, size_t n)
{
    const uint8_t *p=data;
    for (size_t i=0;i<n;i++) { if (p[i]) { return true; } }
    return false;
}
bool edge_power_sleep_due(void)
{
    unsigned int key=irq_lock();
    bool due=edge_mode_current()==EDGE_MODE_BT && !keys_held() && !atomic_get(&writing) &&
        !edge_behavior_queue_busy() &&
        !report_nonzero(&zmk_hid_get_keyboard_report()->body,sizeof(zmk_hid_get_keyboard_report()->body)) &&
        !report_nonzero(&zmk_hid_get_consumer_report()->body,sizeof(zmk_hid_get_consumer_report()->body)) &&
        edge_power_due(MIN((uint64_t)(k_uptime_get()-last_activity),UINT32_MAX),config.sleep_seconds);
    irq_unlock(key);
    return due;
}
static int activity(const zmk_event_t *event)
{
    const struct zmk_position_state_changed *ev=as_zmk_position_state_changed(event);
    unsigned int key=irq_lock();
    if (ev && ev->position < 128) {
        uint32_t mask=1U << (ev->position%32);
        if (ev->state) { held[ev->position/32] |= mask; }
        else { held[ev->position/32] &= ~mask; }
    }
    irq_unlock(key);
    if (ev && ev->state && host_suspended && k_uptime_get()-last_host_wake>=1000) {
        if (!usb_dc_wakeup_request()) { last_host_wake=k_uptime_get(); }
    }
    /* Generated key actions reset the clock too, protecting delayed macros. */
    edge_power_woke();
    return ZMK_EV_EVENT_BUBBLE;
}
ZMK_LISTENER(edge_power,activity);
ZMK_SUBSCRIPTION(edge_power,zmk_position_state_changed);
ZMK_SUBSCRIPTION(edge_power,zmk_keycode_state_changed);
static void poll(struct k_work *work);
K_WORK_DELAYABLE_DEFINE(power_work,poll);
static void poll(struct k_work *work)
{
    unsigned int key=irq_lock();
    enum edge_power_stage next=edge_power_stage_at(&config,MIN((uint64_t)(k_uptime_get()-last_activity),UINT32_MAX),keys_held());
    bool changed=next!=light_stage;
    light_stage=next;
    irq_unlock(key);
    if (changed) { edge_lighting_mode_changed(); }
#if IS_ENABLED(CONFIG_SOC_TLSR8278_SUSPEND)
    int64_t now=k_uptime_get();
    bool host=edge_mode_current()==EDGE_MODE_ON && zmk_usb_get_status()==USB_DC_SUSPEND;
    if (host!=host_suspended) {
        host_suspended=host; host_suspended_since=now;
        if (!host) { edge_power_woke(); }
        edge_lighting_mode_changed();
    }
    if (edge_mode_current()==EDGE_MODE_OFF && now>=20000 && !atomic_get(&writing)) {
        ble_deep_sleep(); /* selector-only wake; no USB or radio in OFF */
    }
    if (host && now>=20000 && now-host_suspended_since>=8000 && !keys_held() &&
        !atomic_get(&writing) && !edge_behavior_queue_busy()) {
        uint32_t status=edge_usb_suspend_once();
        now=k_uptime_get();
        if (status&TLSR8278_WAKEUP_STATUS_PAD) {
            if (now-last_host_wake>=1000 && !usb_dc_wakeup_request()) { last_host_wake=now; }
        }
        if (status&(TLSR8278_WAKEUP_STATUS_PAD|TLSR8278_WAKEUP_STATUS_CORE)) {
            host_suspended_since=k_uptime_get();
        }
    }
#endif
    k_work_reschedule(&power_work,K_SECONDS(1));
}
static int init(void)
{
    last_activity=k_uptime_get();
    k_work_reschedule(&power_work,K_SECONDS(1));
    return 0;
}
SYS_INIT(init,APPLICATION,95);

#if IS_ENABLED(CONFIG_ZMK_STUDIO)
#include <zmk/studio/rpc.h>
/* Capabilities: dim/off=1, connected BLE suspend=2, deep sleep=4. */
static zmk_studio_Response reply(uint32_t status)
{
    zmk_core_EdgePower p={.schema=config.schema,.dim_seconds=config.dim_seconds,
        .off_seconds=config.off_seconds,.sleep_seconds=config.sleep_seconds,
        .dim_percent=config.dim_percent,.capabilities=1,.status=status};
#if IS_ENABLED(CONFIG_TLSR_BLE_LOW_POWER)
    p.capabilities|=2;
#endif
#if IS_ENABLED(CONFIG_TLSR_BLE_DEEP_SLEEP)
    p.capabilities|=4;
#endif
    return ZMK_RPC_RESPONSE(core,edge_power,p);
}
static zmk_studio_Response edge_get_power(const zmk_studio_Request *req)
{
    return reply(future_schema ? 3 : 0);
}
static zmk_studio_Response edge_set_power(const zmk_studio_Request *req)
{
    const zmk_core_EdgePower *p=&req->subsystem.core.request_type.edge_set_power;
    struct edge_power_config candidate={p->schema,p->dim_seconds,p->off_seconds,p->sleep_seconds,p->dim_percent};
    if (future_schema) { return reply(3); }
    if (p->capabilities || p->status || !edge_power_config_valid(&candidate)) { return reply(1); }
    if (memcmp(&candidate,&config,sizeof(config))==0) { return reply(0); }
    if (!atomic_cas(&writing,0,1)) { return reply(2); }
    uint8_t record[RECORD_SIZE];
    encode_record(&candidate,record);
    int rc=settings_save_one("edge_power/config",record,sizeof(record));
    if (!rc) { unsigned int key=irq_lock(); config=candidate; irq_unlock(key); edge_power_woke(); }
    atomic_clear(&writing);
    return reply(rc ? 2 : 0);
}
ZMK_RPC_SUBSYSTEM_HANDLER(core,edge_get_power,ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(core,edge_set_power,ZMK_STUDIO_RPC_HANDLER_SECURED);
#endif
