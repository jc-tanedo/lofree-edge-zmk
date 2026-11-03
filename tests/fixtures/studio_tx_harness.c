// SPDX-License-Identifier: GPL-3.0-or-later
// Host seam for the unmodified compiled C response framing functions.
#include <assert.h>
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>
#include <errno.h>
#define CONFIG_ZMK_STUDIO_RPC_TX_BUF_SIZE 128
#define FRAMING_SOF 0xab
#define FRAMING_ESC 0xac
#define FRAMING_EOF 0xad
#define K_FOREVER 0
#define K_MSEC(v) (v)
#define IS_ENABLED(v) 0
#define EDGE_IO_ADD(index,value) ((void)0)
#define EDGE_IO_SET(index,value) ((void)0)
#define zmk_studio_Response_request_response_tag 1
#define LOG_ERR(...) ((void)0)
#define LOG_WRN(...) ((void)0)
#define RING_BUF_DECLARE(name,size) struct ring_buf name
struct ring_buf { uint8_t data[128];size_t size; };
static uint8_t wire[4096];static size_t wire_len,payload_size;static bool stalled;static int sleeps;
static void drain(struct ring_buf *r){memcpy(wire+wire_len,r->data,r->size);wire_len+=r->size;r->size=0;}
static uint32_t ring_buf_put_claim(struct ring_buf *r,uint8_t **p,uint32_t n){*p=r->data+r->size;return n<128-r->size?n:128-r->size;}
static void ring_buf_put_finish(struct ring_buf *r,uint32_t n){r->size+=n;}
static uint32_t ring_buf_put(struct ring_buf *r,const uint8_t *p,uint32_t n){uint8_t *out;uint32_t got=ring_buf_put_claim(r,&out,n);memcpy(out,p,got);ring_buf_put_finish(r,got);return got;}
static int rpc_transport_mutex;
static void k_mutex_lock(int *p,int t){}static void k_mutex_unlock(int *p){}
static void k_sleep(int n){sleeps++;}
typedef struct pb_ostream_s { bool(*callback)(struct pb_ostream_s*,const uint8_t*,size_t);void *state;size_t max_size,bytes_written; }pb_ostream_t;
typedef struct {int which_type;struct {struct {uint32_t request_id;}request_response;}type;}zmk_studio_Response;
static int zmk_studio_Response_msg;
static bool pb_encode(pb_ostream_t *s,const void *fields,const void *message){uint8_t p[1024];memset(p,42,payload_size);return s->callback(s,p,payload_size);}
static void tx_notify(struct ring_buf *r,size_t n,bool done,void *data){if(done&&!stalled)drain(r);}
static struct {void*(*tx_user_data)(void);void(*tx_notify)(struct ring_buf*,size_t,bool,void*);} transport={NULL,tx_notify},*selected_transport=&transport;
// INSERT_RESPONSE_FUNCTIONS
int main(void){
 const size_t sizes[]={1,125,126,127,128,129,254,255,256,257};
 for(size_t i=0;i<sizeof(sizes)/sizeof(*sizes);i++){
  payload_size=sizes[i];wire_len=0;rpc_tx_buf.size=0;zmk_studio_Response response={0};
  assert(send_response(&response)==0);
  if(wire_len!=payload_size+2||wire[0]!=FRAMING_SOF||wire[wire_len-1]!=FRAMING_EOF){fprintf(stderr,"FAIL: payload=%zu produced %zu bytes; complete frame requires %zu including EOF\n",payload_size,wire_len,payload_size+2);return 1;}
 }
 stalled=true;payload_size=127;wire_len=0;rpc_tx_buf.size=0;sleeps=0;zmk_studio_Response response={0};
 assert(send_response(&response)==-EIO);assert(sleeps==50);
 puts("PASS: actual response writer retains SOF/payload/EOF at 128-byte backpressure boundaries");
}
