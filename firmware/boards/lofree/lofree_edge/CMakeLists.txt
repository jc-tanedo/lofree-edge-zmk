zephyr_library()
zephyr_library_sources(board.c)
zephyr_library_sources(edge_lighting.c)
target_sources_ifdef(CONFIG_LOFREE_EDGE_MODE_SWITCH app PRIVATE "${CMAKE_CURRENT_LIST_DIR}/edge_power.c")
zephyr_library_sources(edge_status.c)
zephyr_library_sources_ifdef(CONFIG_LOFREE_EDGE_MODE_SWITCH edge_mode.c)
target_include_directories(app PRIVATE "${CMAKE_CURRENT_LIST_DIR}")
zephyr_ld_options(-Wl,--wrap=usb_hid_register_device)

# Keep the physically tested upstream debouncer/scanner unchanged except for
# two board-owned scan-boundary hooks. The source checkout remains unmodified.
get_filename_component(EDGE_ROOT "${CMAKE_CURRENT_LIST_DIR}/../../../.." ABSOLUTE)
set(KSCAN_DIR "${EDGE_ROOT}/.deps/zmk-tc32/app/module/drivers/kscan")
set(KSCAN_SOURCE "${KSCAN_DIR}/kscan_gpio_matrix.c")
file(SHA256 "${KSCAN_SOURCE}" KSCAN_SHA)
if(NOT KSCAN_SHA STREQUAL "9c57af513a5028e7d3af5c72334167c6da089c537a5e000a7db3366b2f36bff9")
  message(FATAL_ERROR "Review Edge scan hooks after upstream kscan source changed")
endif()
file(READ "${KSCAN_SOURCE}" KSCAN_CODE)
string(REPLACE "#define DT_DRV_COMPAT zmk_kscan_gpio_matrix"
  "#define DT_DRV_COMPAT lofree_edge_kscan_matrix\n#include \"edge_lighting.h\""
  KSCAN_CODE "${KSCAN_CODE}")
string(REPLACE "    if (data->idle && kscan_matrix_any_active(data->dev) == 0) {"
  "    edge_caps_scan_begin();\n    if (data->idle && kscan_matrix_any_active(data->dev) == 0) {"
  KSCAN_CODE "${KSCAN_CODE}")
string(REPLACE "        kscan_matrix_read_end(data->dev);\n        return;"
  "        kscan_matrix_read_end(data->dev);\n        edge_caps_scan_end();\n        return;"
  KSCAN_CODE "${KSCAN_CODE}")
string(REPLACE "    kscan_matrix_read(data->dev);\n}"
  "    kscan_matrix_read(data->dev);\n    edge_caps_scan_end();\n}"
  KSCAN_CODE "${KSCAN_CODE}")
string(REPLACE "#include \"edge_lighting.h\"" "#include \"edge_lighting.h\"\n#include \"edge_mode.h\"" KSCAN_CODE "${KSCAN_CODE}")
string(REPLACE "                data->callback(dev, r, c, pressed);"
  "                if (edge_mode_allows_keys()) { data->callback(dev, r, c, pressed); }"
  KSCAN_CODE "${KSCAN_CODE}")
file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/edge_kscan.c" "${KSCAN_CODE}")
zephyr_library_include_directories("${KSCAN_DIR}" "${CMAKE_CURRENT_LIST_DIR}")
zephyr_library_include_directories("${EDGE_ROOT}/.deps/zmk-tc32/app/include")
zephyr_library_sources("${CMAKE_CURRENT_BINARY_DIR}/edge_kscan.c")

if(CONFIG_ZMK_STUDIO)
  # CDC FIFO can be full even after irq_tx_ready() was true. Returning lets
  # the USB worker drain it; spinning here blocks that same worker forever.
  # Derive a tiny patch from pinned upstream, preserving the analysis input.
  set(STUDIO_UART "${EDGE_ROOT}/.deps/zmk-tc32/app/src/studio/uart_rpc_transport.c")
  file(SHA256 "${STUDIO_UART}" STUDIO_UART_SHA)
  if(NOT STUDIO_UART_SHA STREQUAL "b179f0922ffa07869be6ebdd20a6f782459ca1301004e6584827c6fa55baab3e")
    message(FATAL_ERROR "Recheck Studio CDC backpressure patch against upstream")
  endif()
  file(READ "${STUDIO_UART}" STUDIO_UART_CODE)
  string(REPLACE "            ring_buf_get_finish(tx_buf, MAX(sent, 0));"
    "            ring_buf_get_finish(tx_buf, MAX(sent, 0));\n            if (sent <= 0) { break; }"
    STUDIO_UART_CODE "${STUDIO_UART_CODE}")
  file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/edge_studio_uart.c" "${STUDIO_UART_CODE}")
  set_source_files_properties("${STUDIO_UART}" TARGET_DIRECTORY app PROPERTIES HEADER_FILE_ONLY TRUE)
  target_sources(app PRIVATE "${CMAKE_CURRENT_BINARY_DIR}/edge_studio_uart.c")
endif()

if(CONFIG_TLSR_BLE)
  # The fork's endpoint supports TLSR_BLE, but Output Selection metadata still
  # tests only ZMK_BLE. Advertise BLE selection for this native stack too.
  set(OUTPUT_SOURCE "${EDGE_ROOT}/.deps/zmk-tc32/app/src/behaviors/behavior_outputs.c")
  file(SHA256 "${OUTPUT_SOURCE}" OUTPUT_SHA)
  if(NOT OUTPUT_SHA STREQUAL "4c07c6ef6a050d373ff64635ab30150be3f7c7858979dfc42290be642e60ec85")
    message(FATAL_ERROR "Recheck Edge native BLE output metadata patch")
  endif()
  file(READ "${OUTPUT_SOURCE}" OUTPUT_CODE)
  string(REPLACE "#if IS_ENABLED(CONFIG_ZMK_BLE)"
    "#if IS_ENABLED(CONFIG_ZMK_BLE) || IS_ENABLED(CONFIG_TLSR_BLE)"
    OUTPUT_CODE "${OUTPUT_CODE}")
  file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/edge_behavior_outputs.c" "${OUTPUT_CODE}")
  set_source_files_properties("${OUTPUT_SOURCE}" TARGET_DIRECTORY app PROPERTIES HEADER_FILE_ONLY TRUE)
  target_sources(app PRIVATE "${CMAKE_CURRENT_BINARY_DIR}/edge_behavior_outputs.c")
endif()

if(CONFIG_TLSR_BLE)
  # Bounded read-only request diagnostics, derived from pinned native sources.
  execute_process(COMMAND "${EDGE_ROOT}/.venv/bin/python"
    "${EDGE_ROOT}/tools/stage_edge_ble_diagnostics.py" "${CMAKE_CURRENT_BINARY_DIR}"
    RESULT_VARIABLE EDGE_BLE_DIAG_RESULT)
  if(NOT EDGE_BLE_DIAG_RESULT EQUAL 0)
    message(FATAL_ERROR "Review Edge BLE diagnostic staging")
  endif()
  set(EDGE_BLE_SOURCE "${EDGE_ROOT}/.deps/zmk-tc32/tc32/src/ble")
  set_source_files_properties("${EDGE_BLE_SOURCE}/ble.c" "${EDGE_BLE_SOURCE}/ble_adv.c"
    TARGET_DIRECTORY app PROPERTIES HEADER_FILE_ONLY TRUE)
  target_sources(app PRIVATE "${CMAKE_CURRENT_BINARY_DIR}/edge_ble.c"
    "${CMAKE_CURRENT_BINARY_DIR}/edge_ble_adv.c")
endif()

if(CONFIG_LOFREE_EDGE_MODE_SWITCH)
  execute_process(COMMAND "${EDGE_ROOT}/.venv/bin/python"
    "${EDGE_ROOT}/tools/stage_edge_mode.py" "${CMAKE_CURRENT_BINARY_DIR}"
    RESULT_VARIABLE EDGE_MODE_STAGE_RESULT)
  if(NOT EDGE_MODE_STAGE_RESULT EQUAL 0)
    message(FATAL_ERROR "Review Edge physical-mode source hooks")
  endif()
  set_source_files_properties("${EDGE_ROOT}/.deps/zmk-tc32/app/src/endpoints.c"
    TARGET_DIRECTORY app PROPERTIES HEADER_FILE_ONLY TRUE)
  set_source_files_properties("${EDGE_ROOT}/.deps/zmk-tc32/app/src/behavior_queue.c" TARGET_DIRECTORY app PROPERTIES HEADER_FILE_ONLY TRUE)
  target_sources(app PRIVATE "${CMAKE_CURRENT_BINARY_DIR}/edge_endpoints.c" "${CMAKE_CURRENT_BINARY_DIR}/edge_behavior_queue.c")
endif()

if(CONFIG_TLSR_BLE_LOW_POWER)
  execute_process(COMMAND "${EDGE_ROOT}/.venv/bin/python"
    "${EDGE_ROOT}/tools/stage_edge_power.py" "${CMAKE_CURRENT_BINARY_DIR}"
    RESULT_VARIABLE EDGE_POWER_STAGE_RESULT)
  if(NOT EDGE_POWER_STAGE_RESULT EQUAL 0)
    message(FATAL_ERROR "Review Edge power staging")
  endif()
  set_source_files_properties("${EDGE_ROOT}/.deps/zmk-tc32/tc32/src/ble/ble_sleep.c"
    "${EDGE_ROOT}/.deps/zmk-tc32/tc32/src/gpio_matrix_sleep.c"
    TARGET_DIRECTORY app PROPERTIES HEADER_FILE_ONLY TRUE)
  target_sources(app PRIVATE "${CMAKE_CURRENT_BINARY_DIR}/edge_ble_sleep.c"
    "${CMAKE_CURRENT_LIST_DIR}/edge_power_matrix.c")
endif()
