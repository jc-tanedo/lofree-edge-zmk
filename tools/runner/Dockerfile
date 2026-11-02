# SPDX-License-Identifier: GPL-3.0-or-later
FROM ubuntu:24.04

ARG RUNNER_VERSION
ARG RUNNER_SHA256
ENV DEBIAN_FRONTEND=noninteractive

LABEL org.opencontainers.image.authors="JC Tanedo" \
      org.opencontainers.image.source="https://github.com/jc-tanedo/lofree-edge-zmk" \
      BaseImage="ubuntu:24.04" \
      RunnerVersion="${RUNNER_VERSION}"

# Python/Node release versions are installed by the pinned setup actions.
# gh is available in Ubuntu 24.04; no additional apt key/repository is needed.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates curl wget git gh jq sudo \
       tar gzip bzip2 unzip zip xz-utils zstd \
       build-essential cmake ninja-build device-tree-compiler protobuf-compiler \
       libtinfo6 libssl-dev libffi-dev \
       python3 python3-venv python3-dev python3-pip nodejs \
    && useradd --create-home --shell /bin/bash docker \
    && printf 'docker ALL=(ALL) NOPASSWD: ALL\n' > /etc/sudoers.d/actions-docker \
    && chmod 0440 /etc/sudoers.d/actions-docker \
    && visudo -cf /etc/sudoers.d/actions-docker \
    && rm -rf /var/lib/apt/lists/*

# Retain the existing runner path and start.sh contract. Verify the runner archive
# against the digest supplied from its official release, then discard the archive.
RUN test -n "${RUNNER_VERSION}" && test -n "${RUNNER_SHA256}" \
    && test "$(dpkg --print-architecture)" = amd64 \
    && mkdir -p /home/docker/actions-runner \
    && curl --fail --show-error --location --retry 3 \
       "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" \
       --output /tmp/actions-runner.tar.gz \
    && printf '%s  /tmp/actions-runner.tar.gz\n' "${RUNNER_SHA256}" | sha256sum --check --strict \
    && tar -xzf /tmp/actions-runner.tar.gz -C /home/docker/actions-runner \
    && /home/docker/actions-runner/bin/installdependencies.sh \
    && chown -R docker:docker /home/docker \
    && rm -f /tmp/actions-runner.tar.gz \
    && rm -rf /var/lib/apt/lists/*

# Build context is the owner's existing runner project, which supplies this file.
COPY --chmod=0755 scripts/start.sh /start.sh
USER docker
ENTRYPOINT ["/start.sh"]
