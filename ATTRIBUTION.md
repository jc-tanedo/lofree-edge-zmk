# Attribution

Thank you to the authors and maintainers below. Links identify the actual sources or references used; credit is not endorsement. Upstream licenses and copyright notices remain unchanged. Original source revisions are recorded in dependencies.lock.json.

## Firmware foundations and shipped components

| Project | Contribution |
| --- | --- |
| [ZMK](https://github.com/zmkfirmware/zmk) and its contributors | Keyboard behaviors, layers, settings and Studio integration |
| [Zephyr](https://github.com/zephyrproject-rtos/zephyr) and its contributors | RTOS, drivers, USB and device model |
| [goyamamoto/zmk-tc32](https://github.com/goyamamoto/zmk-tc32) | Native TC32/Telink platform, Bluetooth stack, OTA and settings support |
| [goyamamoto/zephyr-tc32](https://github.com/goyamamoto/zephyr-tc32) | TC32 architecture, Telink SoC and driver support |
| [goyamamoto/tc32-devtools](https://github.com/goyamamoto/tc32-devtools) | LLVM/Thumb conversion, image validation, emulator and radio models |
| [goyamamoto/tc32-keyboards](https://github.com/goyamamoto/tc32-keyboards) | Board/manifest and build references; not copied as Edge wiring |
| [devbis/zephyr-tlsr8258](https://github.com/devbis/zephyr-tlsr8258) | Earlier architecture work credited by the TC32 platform |
| [ZMK Studio](https://github.com/zmkfirmware/zmk-studio) | Reused editor/RPC/undo architecture and frontend source |
| [Studio TypeScript client](https://github.com/zmkfirmware/zmk-studio-ts-client) | Browser RPC and serial transport |
| [Studio messages](https://github.com/zmkfirmware/zmk-studio-messages) | Protobuf protocol definitions |
| [nanopb](https://github.com/nanopb/nanopb) and [Protocol Buffers](https://github.com/protocolbuffers/protobuf) | Embedded encoding, schemas and emulator test bindings |
| [Telink SDK register references](https://github.com/telink-semi/tc_ble_single_sdk) | Upstream emulator register-table provenance, credited by tc32-devtools; vendor Lofree binaries are not distributed |

## Frontend libraries

[Inter / The Inter Project Authors](https://github.com/rsms/inter) supplies the bundled Inter Variable 4.0 font from the pinned Studio tree, under [SIL OFL 1.1](licenses/Inter-OFL.txt). Its license is retained in website packages. [Fontconfig](https://www.freedesktop.org/wiki/Software/fontconfig/) was used to inspect the font metadata during the publication audit.

[React](https://github.com/facebook/react), [Vite](https://github.com/vitejs/vite), [TypeScript](https://github.com/microsoft/TypeScript), [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss), [daisyUI](https://github.com/saadeghi/daisyui), [Lucide](https://github.com/lucide-icons/lucide), [Font Awesome](https://github.com/FortAwesome/Font-Awesome), [React Aria](https://github.com/adobe/react-spectrum), [Immer](https://github.com/immerjs/immer), [Emittery](https://github.com/sindresorhus/emittery), [async-mutex](https://github.com/DirtyHairy/async-mutex) and their dependencies support the reused Studio application. The generated dependency-notices.json in release packages records exact installed packages, versions, links and license metadata, including transitive packages. [Tauri](https://github.com/tauri-apps/tauri) packages remain upstream build dependencies; a native desktop application is not shipped.

## Investigation and development tools

- [REA — Reverse Engineer Anything](https://github.com/morluto/rea): skill, CLI and MCP tools used for reverse-engineering investigation.
- [Ghidra / NSA and contributors](https://github.com/NationalSecurityAgency/ghidra): static analysis and decompilation.
- [trust1995/Ghidra_TELink_TC32](https://github.com/trust1995/Ghidra_TELink_TC32) and [original rgov processor work](https://github.com/rgov/Ghidra_TELink_TC32): TC32 processor specification used/referenced during analysis. Tool source is not redistributed here.
- [Humanlayer show-me skill / Dex Horthy](https://github.com/humanlayer/skills/blob/main/plugins/show-me/skills/show-me/SKILL.md): evidence-oriented pull-request formatting guidance during publication.
- [OpenAI Codex](https://openai.com/codex/): substantial AI assistance; [disclosure](AI_DISCLOSURE.md).
- [LLVM/Clang/LLD](https://github.com/llvm/llvm-project), [CMake](https://github.com/Kitware/CMake), [Ninja](https://github.com/ninja-build/ninja), [Devicetree compiler](https://git.kernel.org/pub/scm/utils/dtc/dtc.git/), [west](https://github.com/zephyrproject-rtos/west), [Python](https://www.python.org/), [Node.js](https://nodejs.org/), [npm](https://github.com/npm/cli) and [Git](https://git-scm.com/): compilation, dependency management, generators, tests and version control.
- [pyelftools](https://github.com/eliben/pyelftools), [PyYAML](https://github.com/yaml/pyyaml) and the locked Python build dependencies support the build tools; exact versions are in requirements-build.lock.
- [HIDAPI](https://github.com/libusb/hidapi) and [Python HIDAPI bindings](https://github.com/apmorton/pyhidapi): optional USB diagnostics and explicit trial acceptance.
- [Python-Markdown](https://github.com/Python-Markdown/markdown): rendering local risk/roadmap pages.
- [GitHub Actions and Pages](https://docs.github.com/en/actions): automation and hosting infrastructure.

- [7-Zip](https://www.7-zip.org/): installer extraction during private investigation.
- [BlueZ / btmon](https://github.com/bluez/bluez): Bluetooth pairing/transport diagnostics on [CachyOS](https://cachyos.org/). Raw captures and bond material are not published.

## Interoperability and design references

- [Nick Coutsos's Keymap Editor](https://github.com/nickcoutsos/keymap-editor): external .keymap/info.json editing integration and layout conventions.
- [NocFree Link](https://link.nocfree.com/): interface interaction reference; its application source/assets were not copied.
- [Lofree Edge](https://www.lofree.co/products/edge-mechanical-keyboard): hardware and visual reference. Our keyboard illustration is original vector artwork. No official marketing assets, Windows installer or stock firmware are included.

Additional contributors can be recorded here with a verified link and contribution. If an origin cannot be verified after three targeted searches, ask the project owner rather than inventing a link.
