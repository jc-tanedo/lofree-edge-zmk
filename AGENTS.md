# Public development tree

This is the authoritative publishable source tree. Read docs/status.md first.

Keep private vendor material, backups, device keys and raw captures in the workspace's private directory, outside this repository. Build from the pinned public dependencies. Put generated output in ignored build directories.

For UI changes read docs/development.md; verify both localhost and the GitHub Pages subpath. Use isolated preview connections for UI QA. Keep the risk notice visible in disconnected, locked and error states.

For releases read docs/releasing.md and LICENSING.md. A new image requires checks against its exact SHA and a hardware checklist before publication. Maintain ROADMAP.md, current limitations and linked attribution when capabilities or dependencies change.

Record implementation and validation in docs/status.md. Keep unresolved publication gates explicit.
