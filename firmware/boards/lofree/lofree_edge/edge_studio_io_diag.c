/* SPDX-License-Identifier: GPL-3.0-or-later */
#include <zephyr/kernel.h>
#include "edge_studio_io_diag.h"
#include <string.h>
/* One writer per aligned field. Counts, sequences and stream checksums only;
 * no raw payload/key/bond/address storage, flash writes or reset command.
 * Checksums are fingerprints; use this image with the read-only probe only. */
volatile uint32_t edge_studio_io_counts[12] = {[0]=2166136261U, [2]=2166136261U};
void edge_studio_io_decode_error(const char *error, unsigned int framing) {
    static const char *const errors[] = {"io error", "end-of-stream", "zero tag",
        "invalid wire_type", "wrong wire type", "parent stream too short",
        "varint overflow", "integer too large", "invalid field type",
        "invalid size", "array overflow", "bytes overflow", "string overflow"};
    unsigned int code=255;
    for (unsigned int i=0; i<ARRAY_SIZE(errors); i++) {
        if (!strcmp(error, errors[i])) { code=i+1; break; }
    }
    edge_studio_io_counts[11]=code|((framing&255U)<<8);
}
