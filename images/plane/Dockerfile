# syntax=docker/dockerfile:1.10
# SPDX-License-Identifier: Apache-2.0

ARG BASE_IMAGE=debian:trixie-slim@sha256:020c0d20b9880058cbe785a9db107156c3c75c2ac944a6aa7ab59f2add76a7bd

FROM ${BASE_IMAGE} AS fetch

ARG PLANE_VERSION
ARG TARGETARCH

COPY minisign.pub /tmp/minisign.pub

RUN set -eux; \
    test -n "${PLANE_VERSION}"; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl minisign; \
    rm -rf /var/lib/apt/lists/*; \
    case "${TARGETARCH}" in \
        amd64|arm64) artifact="plane-linux-${TARGETARCH}" ;; \
        *) echo "unsupported target architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    url="https://artifacts.laserdata.com/plane/${PLANE_VERSION}/${artifact}"; \
    mkdir -p /out; \
    curl --fail --location --retry 3 --output /out/plane "${url}"; \
    curl --fail --location --retry 3 --output /out/plane.minisig "${url}.minisig"; \
    minisign -Vm /out/plane -p /tmp/minisign.pub; \
    chmod 0755 /out/plane

FROM ${BASE_IMAGE}

ARG PLANE_VERSION

LABEL org.opencontainers.image.title="LaserData plane" \
      org.opencontainers.image.description="AGDX projection and mutation sidecar for Iggy" \
      org.opencontainers.image.source="https://github.com/laserdata/laser-stack" \
      org.opencontainers.image.version="${PLANE_VERSION}" \
      org.opencontainers.image.licenses="Apache-2.0"

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl; \
    rm -rf /var/lib/apt/lists/*; \
    install -d -o 10001 -g 10001 /var/lib/laser-plane /run/laserdata

COPY --from=fetch /out/plane /usr/local/bin/plane
COPY plane/healthcheck /usr/local/bin/plane-healthcheck

RUN chmod 0755 /usr/local/bin/plane-healthcheck

USER 10001:10001
WORKDIR /

ENTRYPOINT ["/usr/local/bin/plane"]

