# Laser Stack

Laser Stack runs one Apache Iggy server and one LaserData plane for local development, SDK examples, and CI.

## Quick Start

Requirements:

- Current Docker Engine or Docker Desktop with Docker Compose
- A 64-bit system supported by Docker (`amd64` or `arm64`)

Laser Stack publishes images for both platforms. Docker selects the matching image automatically, including `arm64` on Apple Silicon.

Start in the background:

```bash
./scripts/up
```

First run creates `.env` with local credentials and mode `600`. It pulls the latest images when available, otherwise it builds them from signed binaries. Startup waits for both services to become healthy and prints a copyable `LASER_CONNECTION_STRING` export.

Later runs pull the latest published images and use the local cache if the registry is unavailable. The Iggy host ports bind to `127.0.0.1` by default.

Run with attached logs:

```bash
./scripts/up --foreground
```

Press `Ctrl-C` to stop an attached stack.

## Laser SDK

[Laser SDK](https://github.com/laserdata/laser-sdk) supports Rust, Python, and TypeScript against this stack with one connection string:

```bash
export LASER_CONNECTION_STRING='iggy:laser@127.0.0.1:8090'
```

Use the value printed by `./scripts/up`. The SDK adds the Iggy TCP scheme.

Run the focused streaming and managed KV examples from the Laser SDK checkout.

Rust from the repository root:

```bash
cargo run --example log
cargo run --example kv
```

Python from `examples/python`:

```bash
uv venv
uv pip install laser-sdk
uv run python log.py
uv run python kv.py
```

TypeScript from `examples/typescript`:

```bash
npm run setup
npm run example:log
npm run example:kv
```

Examples: [Rust](https://github.com/laserdata/laser-sdk/tree/main/examples/rust), [Python](https://github.com/laserdata/laser-sdk/tree/main/examples/python), [TypeScript](https://github.com/laserdata/laser-sdk/tree/main/examples/typescript).

Run `./scripts/smoke` to verify Iggy health, plane readiness, and the managed path end to end. The published TypeScript SDK executes the AGDX hello and a managed KV set/get through Iggy, the UDS sidecar, and laser-plane.

VSR is unconditional. No stack or connection-string protocol flag is needed.

## Services

| Service | Address | Volume |
| --- | --- | --- |
| Iggy TCP | `127.0.0.1:8090` | `iggy-data` |
| Iggy HTTP | `127.0.0.1:3000` | `iggy-data` |
| LaserData plane | internal | `plane-data` |
| Plane socket | `/run/laserdata/plane.sock` | `plane-run` |

## Commands

| Command | Action |
| --- | --- |
| `./scripts/up` | Start detached and wait for health |
| `./scripts/up --foreground` | Start attached |
| `./scripts/up --build` | Build from signed binaries |
| `./scripts/up --random-password` | Generate random credentials for a new data volume |
| `./scripts/smoke` | Health, readiness, and a managed SDK round trip |
| `./scripts/logs [service]` | Follow logs |
| `./scripts/down` | Stop and keep data |
| `./scripts/reset` | Stop and delete stack data |
| `./scripts/reset --yes` | Reset without a prompt |

`down` preserves all volumes. `reset` removes only this stack's volumes.

## Configuration

Edit `.env` before startup:

| Variable | Default | Purpose |
| --- | --- | --- |
| `LASER_BIND_ADDRESS` | `127.0.0.1` | Iggy host interface |
| `LASER_IGGY_PORT` | `8090` | Iggy TCP host port |
| `LASER_IGGY_HTTP_PORT` | `3000` | Iggy HTTP host port |
| `LASER_IGGY_USERNAME` | `iggy` | Root username |
| `LASER_IGGY_PASSWORD` | `laser` | Root password |
| `LASER_IGGY_CPU` | `skylake` | Iggy build optimization on amd64 |
| `LASER_IGGY_IMAGE` | `docker.io/laserdatainc/iggy-server:latest` | Iggy runtime image |
| `LASER_PLANE_IMAGE` | `docker.io/laserdatainc/laser-plane:latest` | Plane runtime image |

Most users do not need to change `LASER_IGGY_CPU`. It selects the prebuilt Iggy binary when building locally on amd64, with `skylake`, `icelake`, `sapphirerapids`, and `znver3` available. The setting is ignored on arm64.

## Security

Iggy and Laser SDK support TLS. Laser SDK enables TLS automatically for LaserData cloud hosts.

The included Docker Compose profile is intended for local development. It does not provision local certificates, so its Iggy TCP and HTTP listeners bind to `127.0.0.1` by default. If you change `LASER_BIND_ADDRESS`, configure Iggy TLS and a trusted CA before allowing access from another machine.

Default local credentials are `iggy:laser`. On first startup, Iggy stores the root account in the Docker named volume `laser-stack_iggy-data`, shown as `iggy-data` in Compose. Changing `.env` later does not replace credentials already stored in that volume.

Use a random 32-character password for a new data volume:

```bash
./scripts/reset --yes
./scripts/up --random-password
```

Stop the stack before backing up `iggy-data` and `plane-data`.

## Artifact Trust

Local builds download signed binaries from `https://artifacts.laserdata.com`. Each Dockerfile verifies the adjacent minisign signature with `images/minisign.pub`.

Published Docker Hub images include amd64 and arm64 manifests and are signed with cosign. CI verifies that the images can be pulled without authentication.

Verify a release image:

```bash
cosign verify \
  --certificate-identity-regexp 'https://github.com/laserdata/laser-stack/' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  docker.io/laserdatainc/iggy-server:latest
```

## Troubleshooting

```bash
docker compose --env-file .env ps
./scripts/logs
```

| Symptom | Check |
| --- | --- |
| Plane is unhealthy | Check plane logs and the internal `/health` (liveness) and `/ready` (managed readiness) endpoints |
| SDK authentication fails | Check `.env` and exported `LASER_*` values |
| AGDX or KV times out | Confirm both services are healthy, then check plane logs |
| A host port is occupied | Change its port in `.env` |

`up` and `smoke` print container state and recent logs on failure.
