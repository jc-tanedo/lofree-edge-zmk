/* Experimental: no unverified CIDOO pad initialization is copied here. */
#include "tlsr_slots.h"
#include "tlsr_spi_flash.h"
#ifdef CONFIG_TLSR_BOOT_GUARD_EARLY
void board_early_init_hook(void)
{
    tlsr_spi_flash_trim_calib();
    tlsr_boot_guard_early();
}
#endif
