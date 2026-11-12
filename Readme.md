# Botrucho

Discord bot **v2**, using Node.js 26+ and TypeScript 7.

## Run locally

Set `DOTENV_PRIVATE_KEY_PRODUCTION` in your terminal, then use the existing Compose workflow:

```bash
docker compose up --build
```

Compose defaults to one shard. To recreate an already built container in PowerShell:

```powershell
$env:VERSION = '2.0.0'
$env:SHARDS = '1'
docker compose up -d --force-recreate
docker compose logs -f botrucho
```

Use a separate test bot/token rather than connecting locally alongside production. If host port 3000 is occupied, free that port or change the **host side** of the Compose port mapping, not the bot's internal port.

To build the image without starting the bot:

```bash
docker build -f docker/Dockerfile -t botrucho:local .
```

`docker-compose.yml` stays at the root and points to `docker/Dockerfile`; they do not need to be colocated.

## Configuration and deployment

Keep application settings in encrypted `.env.production`. The only application secret supplied separately is **`DOTENV_PRIVATE_KEY_PRODUCTION`**. Both Docker and systemd use the same pinned dotenvx CLI from production dependencies.

GitHub builds/tests the app, uploads compiled files plus encrypted configuration using predefined actions, and restarts systemd on GCP. There is no custom `scripts/` folder or environment reconstruction from individual secrets.

- [GCP setup, Terraform modules and four GitHub Secrets](terraform/README.md)
- [Optional, inactive Portainer/Docker module](terraform/modules/portainer/README.md)

## Development checks

```bash
nvm use
npm ci
npm run lint
npm test
npm run build
```

Build output starts at `dist/src/sharder.js`; production's working directory is `dist/` so assets and languages resolve correctly. [Tests are organized by category](tests/README.md), not labeled as E2E when they use local substitutes.

For all Linux checks in a disposable container, without starting Discord:

```bash
docker build -f docker/Dockerfile.ci -t botrucho:checks .
```
