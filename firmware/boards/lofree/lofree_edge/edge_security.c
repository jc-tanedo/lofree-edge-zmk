/* SPDX-License-Identifier: GPL-3.0-or-later */
#include <errno.h>
#include <string.h>
#include <zephyr/settings/settings.h>
#include <zephyr/sys/atomic.h>
#include <zephyr/sys/byteorder.h>
#include <zephyr/sys/crc.h>
#include <zmk/studio/core.h>
#include <zmk/studio/rpc.h>
#include "edge_security.h"

/* Missing, corrupt and unsupported records fail closed. This is separate from
 * keymap/power settings, so an upgrade does not reset either of those records. */
static bool require_unlock=true, future_schema;
static atomic_t writing;
#define SCHEMA 1
#define RECORD_SIZE 12
bool edge_security_requires_unlock(void) { return require_unlock; }
static int load(const char *name, size_t len, settings_read_cb read_cb, void *arg)
{
    if (strcmp(name,"config")) { return -ENOENT; }
    uint8_t record[RECORD_SIZE];
    if (len!=sizeof(record) || read_cb(arg,record,sizeof(record))!=sizeof(record) ||
        sys_get_le32(record+8)!=crc32_ieee(record,8)) { return 0; }
    uint32_t schema=sys_get_le32(record), value=sys_get_le32(record+4);
    if (schema>SCHEMA) { future_schema=true; return 0; }
    if (schema==SCHEMA && value<=1) { require_unlock=value; }
    return 0;
}
SETTINGS_STATIC_HANDLER_DEFINE(edge_security,"edge_security",NULL,load,NULL,NULL);
static zmk_studio_Response reply(uint32_t status)
{
    zmk_core_EdgeSecurity s={.schema=SCHEMA,.require_unlock=require_unlock,.status=status};
    return ZMK_RPC_RESPONSE(core,edge_security,s);
}
static zmk_studio_Response edge_get_security(const zmk_studio_Request *req)
{
    return reply(future_schema ? 3 : 0);
}
static zmk_studio_Response edge_set_security(const zmk_studio_Request *req)
{
    const zmk_core_EdgeSecurity *p=&req->subsystem.core.request_type.edge_set_security;
    if (future_schema) { return reply(3); }
    if (p->schema!=SCHEMA || p->require_unlock>1 || p->status) { return reply(1); }
    if (p->require_unlock==require_unlock) { return reply(0); }
    if (!atomic_cas(&writing,0,1)) { return reply(2); }
    uint8_t record[RECORD_SIZE];
    sys_put_le32(SCHEMA,record); sys_put_le32(p->require_unlock,record+4);
    sys_put_le32(crc32_ieee(record,8),record+8);
    int rc=settings_save_one("edge_security/config",record,sizeof(record));
    if (!rc) {
        require_unlock=p->require_unlock;
        /* Enabling immediately locks this session; disabling bypasses idle and
         * disconnect relocking. All RPC authorization still uses upstream core. */
        if (require_unlock) { zmk_studio_core_lock(); }
        else { zmk_studio_core_unlock(); }
    }
    atomic_clear(&writing);
    return reply(rc ? 2 : 0);
}
ZMK_RPC_SUBSYSTEM_HANDLER(core,edge_get_security,ZMK_STUDIO_RPC_HANDLER_SECURED);
ZMK_RPC_SUBSYSTEM_HANDLER(core,edge_set_security,ZMK_STUDIO_RPC_HANDLER_SECURED);
