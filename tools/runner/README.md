# Self-hosted runner image

This Dockerfile adapts the owner's existing runner image. It keeps the `docker`
user, `/home/docker/actions-runner`, and the existing `scripts/start.sh` entrypoint.
The startup script and registration credentials are not part of this repository.

Ubuntu 24.04 is required for the pinned setup-python distribution. Build tools,
`gh`, compiler/runtime libraries and compression utilities are preinstalled.
Passwordless sudo permits the workflow's apt prerequisite step; jobs continue to
run as `docker`. Use these runners only for trusted repository changes. Release
Python, Node and LLVM versions remain controlled by the repository's lockfiles
and setup actions, not the distribution's default Python/Node packages.

## Rebuild the existing runner project

1. Copy this Dockerfile into your runner project, alongside its existing
   `scripts/start.sh`. Keep your registration/startup configuration unchanged.
2. Choose the runner version you already deploy or another supported version from
   [actions/runner releases](https://github.com/actions/runner/releases).
   Copy the official SHA-256 for its **Linux x64** archive. Both build arguments
   are required; a missing or mismatched checksum fails the build.
3. Build from that runner project's directory (substitute the actual values):

   ```sh
   docker build --pull \
     --build-arg RUNNER_VERSION='<runner-version>' \
     --build-arg RUNNER_SHA256='<official-linux-x64-sha256>' \
     -t lofree-actions-runner:ubuntu24 .
   ```

4. Wait for active jobs to finish. Recreate your runner containers using the new
   image and your existing environment/registration settings. Restarting an old
   container does not replace its image. Preserve the `self-hosted`, `Linux`,
   `X64` labels. Do not reuse an old Ubuntu 20.04 image or its language tool cache.
5. Verify inside a replacement container:

   ```sh
   cat /etc/os-release
   sudo -n true
   command -v git gh cmake ninja dtc protoc zstd python3
   ```

6. Retry CI. It must pass the pinned setup actions and compiler setup before the
   firmware/emulator tests can validate the candidate.

The Docker build context should contain only runner configuration. Exclude tokens,
`.env`, registration files, logs, caches and repository workspaces with your
`.dockerignore`. Never bake registration tokens into the image. The Dockerfile
only copies `scripts/start.sh`; confirm that script reads credentials at runtime.
