# Current development status

Updated 2026-11-03. Authoritative branch: `firmware/power-management`; PR [#12](https://github.com/jc-tanedo/lofree-edge-zmk/pull/12) targets `main`. Do not merge or publish without review. [Historical handoff](history/power-management-handoff.md) preserves the investigation chronology; its pending statements describe earlier checkpoints.

## Implemented in this PR

- Studio Power: stored dim/off/Bluetooth sleep deadlines, Never, relative dim brightness, validation and save/readback. Connected suspend, disconnected deep sleep and selector-only OFF wake.
- Optional default-on Studio physical unlock, with Security tab and missing-binding Save/enable guards. Presence checks do not establish layer reachability.
- Browser-local keymap drafts until explicit Save, accurate counts, Undo/Redo, discard/navigation and conflict guards.
- Bounded complete-frame Studio RPC decoding, framing regressions, loading/progress/error/retry and reconnect handling.
- React Firmware page/shared risk styling; guided installation with restart loading, image verification, self-test, acceptance and readback. Finalize is inside its wizard step. Development/unapproved images remain trials.
- Self-hosted CI and scoped cleanup; fork PRs cannot execute jobs. Owner-reviewed changes must be explicitly brought onto a repository-owned branch before CI.

## Physical evidence and installed image

Installed OTA SHA-256: `afa70869c44ad586ab02ae543652acf7d54125a8bd2c99a18e5b9688d251ef69` (122180 bytes). Owner completed the browser identity/finalization flow and the real guided wizard on this same image. Independent read-only status confirmed accepted/count 0, slot B and retained-image integrity. Last reported USB connected, selector ON; no agent writes are needed.

[Normal decoder record](validation/v0.1.0-alpha.3-complete-frame.md): SHA `5b53224452589907eeafd485b294800023bbf5114746f1feebb9230e8cc8ff5b` passed 1,786 reads, repeated browser reconnect/draft checks, typing/media/indicators, Power controls, battery/BT/OFF/USB modes, six ordinary wake rows, host suspend, modifiers, Security guards and persistence. Deep wake consumes the initial key and reconnects within a few seconds without re-pairing.

[Later identity/wizard record](validation/v0.1.0-alpha.3-browser-identity.md): focused baseline/settings, browser-sized identity and actual installation/finalization tests on `afa70869…`. Unrelated physical sequences were not repeated, explicitly requested by the owner, who will daily-drive and report regressions. Earlier-image passes are not certification of this later binary. Custom Power values were restored/read back; exact values were not provided. Protection remains enabled with Unlock Studio intact.

## Review and remaining gates

Independent pinned reviews found no Spec-axis gap and one Standards blocker: fork access to privileged self-hosted runners. That routing is corrected. The focused Standards follow-up found no remaining blocker; the Spec review found none. Binding reachability remains [follow-up #17](https://github.com/jc-tanedo/lofree-edge-zmk/issues/17). Server-side fork approval now requires all external contributors; readback verified, with only the owner as repository collaborator. All local preflight stages passed: 49 Python tests, web/codec/framing tests, normal and diagnostic builds, compiled emulator suites, both 30-target website checks, and 254-file source/history/archive/site audits. The first website check caught relative validation links in packaged Security; repository links corrected them and packaging/audits passed on rerun. Firmware reproduces the installed SHA unchanged. PR CI is pending the review push. No hardware writes, merge, tag, release or Pages deployment are part of PR preparation.

Functional issue [#2](https://github.com/jc-tanedo/lofree-edge-zmk/issues/2) closes on merge. Separate follow-ups: [measured current #15](https://github.com/jc-tanedo/lofree-edge-zmk/issues/15), [Fn/media cold wake #13](https://github.com/jc-tanedo/lofree-edge-zmk/issues/13), [deep-wake first key #16](https://github.com/jc-tanedo/lofree-edge-zmk/issues/16), [battery sensing #4](https://github.com/jc-tanedo/lofree-edge-zmk/issues/4), [host coverage #5](https://github.com/jc-tanedo/lofree-edge-zmk/issues/5), [direct ZMK updates #14](https://github.com/jc-tanedo/lofree-edge-zmk/issues/14). See [roadmap](../ROADMAP.md).

No measurement equipment is available. Current draw/battery life remain unmeasured. The measured-current and exact-artifact release gates remain required; public automatic-install approval registry remains empty pending release review. Merge readiness is not release approval. Do not reflash for UI/docs-only work or repeat unrelated hardware tests. Run local checks during development; hand off to CI for PR review.

Firmware, website, tools and instructions are experimental. Use at your own risk; retained stock recovery is not guaranteed.
