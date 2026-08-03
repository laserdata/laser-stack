---
name: laser-stack-overview
description: Operational map for Laser Stack. Load for changes to Compose, Docker images, startup scripts, smoke tests, release publishing, or public setup documentation.
---

# Laser Stack overview

## Purpose

Laser Stack runs Apache Iggy with the LaserData plane for local SDK development and CI. This repository packages signed binaries into Docker images. It does not build either component from source.

The public SDK surface is exercised through Rust, Python, and TypeScript in the sibling `laser-sdk` repository. VSR framing is unconditional and has no stack configuration flag.

## Runtime

- `iggy` serves TCP and HTTP, owns the durable log, and forwards managed commands over the shared Unix socket.
- `plane` connects to Iggy, owns managed read models, and serves the Unix socket used by Iggy.
- `iggy-data` stores Iggy data and accounts. Docker names it `laser-stack_iggy-data`.
- `plane-data` stores plane state.
- `plane-run` carries the shared Unix socket.

Host ports bind to loopback by default. The plane has no host port.

## Invariants

- Docker Hub namespace is `laserdatainc`.
- Runtime images are `docker.io/laserdatainc/iggy-server:latest` and `docker.io/laserdatainc/laser-plane:latest`.
- Component artifact versions belong in `.env.example` and Compose build arguments. Do not turn them into Docker tags or repeat them in README prose.
- CI builds and tests `linux/amd64` and `linux/arm64`, then publishes one multi-platform `latest` manifest for each image.
- Architecture staging tags are implementation details of the publish workflow. User-facing image references stay on `latest`.
- Every downloaded component binary must have a valid minisign signature under `images/minisign.pub` before it enters an image.
- Do not put Docker Hub credentials or repository-secret setup in the public README.

## Commands

`./scripts/up` pulls the latest images. If the registry is unavailable, it uses the local cache or builds from signed artifacts when no local images exist.

`./scripts/up --build` always rebuilds from signed artifacts and waits for both services to become healthy.

`./scripts/smoke` checks Iggy TCP, plane readiness, AGDX capability negotiation, and a managed KV set/get through the published TypeScript SDK.

`./scripts/down` stops containers and preserves data. `./scripts/reset --yes` removes only this stack's containers, network, and named volumes. It does not delete images.

## File map

- `compose.yaml`: services, volumes, healthchecks, ports, and build arguments.
- `.env.example`: tested artifact inputs, image references, credentials, and timeouts.
- `images/iggy/Dockerfile`: architecture-specific Iggy artifact selection and signature verification.
- `images/plane/Dockerfile`: architecture-specific plane artifact selection and signature verification.
- `images/*/healthcheck`: container health contracts.
- `scripts/_common`: environment parsing, validation, retries, readiness waits, and diagnostics.
- `scripts/up`, `scripts/down`, `scripts/reset`, `scripts/logs`: lifecycle commands.
- `scripts/smoke` and `scripts/smoke.mjs`: end-to-end managed SDK check.
- `.github/workflows/build.yml`: native architecture builds, smoke, Docker Hub publication, multi-platform manifests, signing, and anonymous-pull verification.

## Verification

Run static checks first:

```bash
bash -n scripts/_common scripts/up scripts/down scripts/logs scripts/reset scripts/smoke
docker compose --env-file .env.example config --quiet
node --check scripts/smoke.mjs
```

Run the real path before declaring runtime changes complete:

```bash
./scripts/reset --yes
./scripts/up --build
./scripts/smoke
./scripts/reset --yes
```

For SDK compatibility, run the `log` and `kv` examples from `../laser-sdk/examples/rust`, `../laser-sdk/examples/python`, and `../laser-sdk/examples/typescript`. `log` proves ordinary streaming. `kv` proves the managed plane path.

For workflow or shell changes, also run ShellCheck and Actionlint. For cross-platform changes, verify that both architecture artifact paths and signatures exist. A local amd64 build does not prove that the arm64 artifact path is correct.
