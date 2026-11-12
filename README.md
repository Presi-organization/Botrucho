# Botrucho

A Discord bot for music, utilities, scheduled events and attendance tracking. **Version 2 requires Node.js 26+ and uses TypeScript 7.**

## Features

- Voice/music commands using discord-player and a YouTube extractor.
- Text-to-speech through Azure Speech.
- TFT rank, football and SIATA radar commands.
- Guild utilities, language settings, games and management commands.
- MongoDB-backed event attendance and scheduled jobs.
- Sharded Discord processes with instance leases and coordinated shutdown.

External integrations require valid configuration and permissions; repository tests do not connect to production Discord, MongoDB or third-party APIs.

## Quick start: Docker Compose

For local use, you need a Git checkout, Docker with Compose, and the private key for the committed encrypted `.env.production`. **Node, Terraform and Google Cloud CLI are not required on your PC just to run Compose.**

Provide `DOTENV_PRIVATE_KEY_PRODUCTION` in your terminal without committing or sharing it. For example, in **PowerShell 7**, enter it without placing the value in command history:

```powershell
$env:DOTENV_PRIVATE_KEY_PRODUCTION = Read-Host "dotenvx production private key" -MaskInput
docker compose up --build -d
docker compose logs -f botrucho
```

On other shells, provide the same environment variable using your normal secret-management mechanism, then run `docker compose up --build`.

Useful local commands:

```bash
docker compose logs -f botrucho
docker compose restart botrucho
docker compose down
```

The health endpoint is published on **http://127.0.0.1:3000/** by default. It returns 503 during initialization/readiness loss and 200 when ready. Compose defaults `SHARDS` to `1` and applies memory, CPU and log-rotation limits.

Use a separate test bot/token where possible. Do not run local and production instances for the same application/shard simultaneously—the instance lease intentionally prevents this.

### Build without starting Discord

```bash
docker build -f docker/Dockerfile -t botrucho:local .
```

`docker-compose.yml` stays at the repository root and references `docker/Dockerfile`. The Compose image tag defaults to `latest`; set `VERSION=2.0.0` in your terminal if you want that explicit tag.

## Configuration

Application settings live in **encrypted `.env.production`**. Both Docker and systemd use the pinned `@dotenvx/dotenvx` CLI with strict decryption:

- The only separately supplied **application secret** is `DOTENV_PRIVATE_KEY_PRODUCTION`.
- Discord, MongoDB and optional API credentials remain encrypted in the file; CI does not reconstruct them from individual Secrets.
- Never commit `.env.keys`, decrypted `.env` files, private SSH keys, Terraform state or private tfvars.
- Enable **Server Members Intent** in Discord Developer Portal, and grant the channel/voice/thread permissions needed by the commands you use.

Changing a runtime environment variable requires container recreation, not just `docker compose restart`:

```bash
docker compose up -d --force-recreate
```

## Development and tests

For development outside Docker, install **Node.js 26+** using your preferred version manager (`.nvmrc` contains `26`). Native dependencies such as canvas may need platform build tools; the Docker verification image provides a controlled Linux environment.

From a Git checkout:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Tests use Node's built-in runner and are organized by purpose:

| Command                    | Scope                                                             |
| -------------------------- | ----------------------------------------------------------------- |
| `npm run test:unit`        | Functions, lifecycle helpers and in-memory dependencies           |
| `npm run test:integration` | Local HTTP, runtime orchestration, dotenvx and process signals    |
| `npm run test:contracts`   | Configuration, packaging, workflows, docs and repository policies |
| `npm run test:platform`    | Guarded Linux checks for Git ownership, sudo and systemd          |

There is **no live E2E suite**. Some checks are Linux-only; privileged sudo tests belong only in the disposable verification container. See [the test guide](tests/README.md) for safety details and single-file commands.

Run the complete Linux checks without starting the real bot:

```bash
docker build -f docker/Dockerfile.ci -t botrucho:checks .
```

`npm run build` typechecks, compiles through SWC and copies assets/languages. The compiled entrypoint is **`dist/src/sharder.js`**. Production runs with **`dist/` as its working directory** so runtime resources resolve. SWC rewrites `@/*` and `@languages/*`; there is no production alias hook or custom `scripts/` directory.

## Deployment

The GCP workflow is **`.github/workflows/deploy.yml`**, triggered by pushes and PR merges to **`master`**. Feature-branch pushes do not deploy.

It installs/tests/builds on GitHub in Debian 13 / Node 26, prunes development dependencies, uploads compiled files plus encrypted configuration using pinned actions, then restarts systemd and checks that the service is active.

**The deployment workflow does not bootstrap an empty VM or run Terraform.** Node, `botuser`, SSH access, the application directory and the systemd unit must be configured once before a successful deployment. The VM does not clone the repository or compile the bot.

GitHub uses four repository Secrets: the dotenvx application key plus `VM_HOST`, `VM_SSH_PRIVATE_KEY` and `VM_SSH_KNOWN_HOSTS`. See [the GCP setup guide](terraform/README.md) for their exact contents, existing-VM adoption, public-IP costs and host verification.

Terraform has one root under `terraform/`, activating only `modules/gcp`. The [Portainer module](terraform/modules/portainer/README.md) and its manual-only workflow are preserved alternatives, not part of the active GCP deployment.

## Troubleshooting and limits

- **Host port 3000 occupied:** stop the conflicting service or change only the host side of the Compose port mapping. Do not change the bot's internal port merely to resolve a host collision.
- **SHARDS validation error:** use a positive integer such as `1`, not `auto`. Compose supplies `SHARDS=1` unless explicitly overridden; recreate the container after changes.
- **Decryption failure:** confirm the key matches encrypted `.env.production`. Do not replace encrypted values with plaintext to bypass the error.
- **Git ownership errors in a container:** the workflow explicitly trusts only `$GITHUB_WORKSPACE`; do not disable Git protection globally with `safe.directory=*`.
- **Dependency warnings:** audit output is separate from build/test failures. Review `npm audit --omit=dev` and the [dependency triage](docs/security-dependency-triage.md); passing tests does not mean every advisory is resolved.
- **Deployment verification:** `systemctl is-active` is not a full Discord/Mongo readiness or load test. Uploads are in-place, without automatic rollback. Check service logs and verify integrations before treating a deployment as production-ready.
