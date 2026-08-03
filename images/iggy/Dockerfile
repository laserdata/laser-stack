# syntax=docker/dockerfile:1.10
# SPDX-License-Identifier: Apache-2.0

ARG BASE_IMAGE=debian:trixie-slim@sha256:020c0d20b9880058cbe785a9db107156c3c75c2ac944a6aa7ab59f2add76a7bd

FROM ${BASE_IMAGE} AS fetch

ARG IGGY_VERSION
ARG IGGY_CPU=skylake
ARG TARGETARCH

COPY minisign.pub /tmp/minisign.pub

RUN set -eux; \
    test -n "${IGGY_VERSION}"; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl minisign; \
    rm -rf /var/lib/apt/lists/*; \
    case "${TARGETARCH}" in \
        amd64) \
            case "${IGGY_CPU}" in \
                skylake|icelake|sapphirerapids|znver3) ;; \
                *) echo "unsupported IGGY_CPU: ${IGGY_CPU}" >&2; exit 1 ;; \
            esac; \
            artifact="iggy-server-linux-amd64-${IGGY_CPU}" \
            ;; \
        arm64) artifact="iggy-server-linux-arm64" ;; \
        *) echo "unsupported target architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    url="https://artifacts.laserdata.com/iggy-server/${IGGY_VERSION}/${artifact}"; \
    mkdir -p /out; \
    curl --fail --location --retry 3 --output /out/iggy-server "${url}"; \
    curl --fail --location --retry 3 --output /out/iggy-server.minisig "${url}.minisig"; \
    minisign -Vm /out/iggy-server -p /tmp/minisign.pub; \
    chmod 0755 /out/iggy-server

FROM ${BASE_IMAGE}

ARG IGGY_VERSION

LABEL org.opencontainers.image.title="LaserData Iggy server" \
      org.opencontainers.image.description="Iggy server with the LaserData plane bridge" \
      org.opencontainers.image.source="https://github.com/laserdata/laser-stack" \
      org.opencontainers.image.version="${IGGY_VERSION}" \
      org.opencontainers.image.licenses="Apache-2.0"

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates libcap2 libhwloc15 libudev1; \
    rm -rf /var/lib/apt/lists/*; \
    install -d -o 10001 -g 10001 /var/lib/iggy /run/laserdata

COPY --from=fetch /out/iggy-server /usr/local/bin/iggy-server
COPY iggy/healthcheck /usr/local/bin/iggy-healthcheck

RUN chmod 0755 /usr/local/bin/iggy-healthcheck

USER 10001:10001
WORKDIR /

ENTRYPOINT ["/usr/local/bin/iggy-server"]
