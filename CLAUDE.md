# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Botrucho is a sharded Discord bot (TypeScript 7, Node 26+, discord.js 14, MongoDB/Mongoose) for music, utilities, scheduled events, attendance, football and Gemini-powered mentions. The README covers Docker, deployment and secrets setup in depth.

## Commands

```bash
npm run lint            # oxlint + eslint (import order) + prettier --check, all must pass
npm run lint:fix        # eslint --fix + prettier --write
npm run typecheck       # tsc --noEmit (the only real type check; eslint only parses syntax)
npm run build           # typecheck, clean, SWC compile to dist/, copy assets/ and languages/
npm start               # build + run via dotenvx with .env.development (needs DOTENV_PRIVATE_KEY_DEVELOPMENT)
npm test                # every suite; also test:unit | test:integration | test:contracts | test:platform
node --test tests/unit/football.test.cjs                               # one file
node --test --test-name-pattern=heartbeat "tests/unit/**/*.test.cjs"   # filter by test name
docker build -f docker/Dockerfile.ci -t botrucho:checks .              # full Linux verification, never contacts Discord/Mongo
```

- The compiled entrypoint is `dist/src/sharder.js`, run with `dist/` as the working directory. Tests run TypeScript directly through `tests/helpers/register-typescript.cjs`.
- `package-lock.json` must be regenerated with Node 26's npm, not the local one: run `npm install --package-lock-only --ignore-scripts` inside `node:26-trixie-slim` (set `MSYS_NO_PATHCONV=1` in Git Bash). The local npm drops `@emnapi/*` entries and `npm ci` then fails in Docker. Run `npm run version:patch|minor|major` in that same image.
- `.env.development` and `.env.production` are dotenvx-encrypted. Never edit them; give the user the `npx dotenvx set ... -f <file>` command instead.
- Pushes and merges to `master` deploy to the GCP VM (`.github/workflows/deploy.yml`) with no automatic rollback.

## Architecture

**Process model.** `src/sharder.ts` is a small manager that stays independent of the bot's import graph. It validates `MONGO_URI`, `DISCORD_TOKEN`, `CLIENT_ID` and `SHARDS` (a positive integer, never `auto`), spawns one child process per shard running `bot.js`, and serves the health route (503 until every shard is ready, 200 after). Shards talk to it over IPC messages (`botrucho:ready`, `botrucho:stopping`, `botrucho:shutdown`), handled by `src/runtime/supervisor.ts`. `respawn` is off on purpose: Docker or systemd owns restarts, and any shard death shuts the whole tree down.

**Per-shard boot (`src/bot.ts`).** Connect Mongo, claim an instance lease (`runtime/instance-lease.ts`, key `clientId:shardId`, renewed every 10s; losing it shuts the shard down), load player extractors, load commands and events, log in, then on `clientReady` start presence rotation and cron jobs. Teardown goes through `createShutdown` in `runtime/lifecycle.ts` as an ordered list of steps with a timeout; new long-lived resources (timers, listeners) need a step there.

**Client.** `Botrucho` (`src/mongodb/base/Botrucho.ts`) extends discord.js `Client` and carries everything shared: the `Player`, the command collection, `CommandLoader`, `CronManager`, the Mongo controllers (`guildData`, `eventData`, `cronData`, ...) and the AI limiter/settings. `src/utils/extenders.util.ts` adds prototype methods such as `interaction.translate(...)`, `guild.fetchDB(...)` and `guild.translate(...)`; it is imported once in `bot.ts`.

**Commands.** A command is a class extending `ICommand` (`src/types/commands/command.type.ts`) with `name`, `data` (a slash command builder) and `execute(interaction, guildDB)`. It must be exported from its category `index.ts` (`games`, `management`, `music`, `say`, `searching`) and listed in `commandRegistry` in `src/commands/registry.ts`. `CommandLoader` instantiates the registry and PUTs all commands globally on every startup, so there is no separate deploy step. `CommandHandler` blocks commands in `guildDB.disabledCommands` and runs `execute` inside the player context.

**Events.** There is no event registry. `CommandLoader` imports every `.js` file in `src/events/discord/` and `src/events/player/`, and the filename is the event name (`messageCreate.ts` handles `messageCreate`; each exports `execute(client, ...args)`). `interactionCreate` runs a chain of handler classes from `interactionCreateHandlers/`, and the first one whose `handle` returns `true` wins. Handlers are wrapped in `safeHandler`, so an error is logged and never crashes a shard.

**Cron jobs.** `CronManager` (`src/services/cron-manager.service.ts`) schedules rows of the `CronData` collection in `America/Bogota`, one run at a time per job. Jobs are dispatched by a `switch` on `cronName` in `executeCronJob`, so a new job needs a new `case`. Rows are not seeded in general; `footballDaily` is the exception and is created on startup if missing. `/crons` edits rows at runtime.

**AI mentions.** `events/discord/messageCreate.ts` hands bot mentions to `messageHandlers/ai-mention.handler.ts`, which calls Gemini on Vertex AI (`services/REST/gemini.service.ts`). Settings are global in Mongo (`AiSettings`, edited from `/ai settings`, refreshed by every shard within 30s), usage is counted per UTC day in `AiUsage`, and the default system prompt is `assets/ai/system-instruction.md`. AI is off in every server until an owner enables it.

**Football.** `/football` shows a day's matches; `/football-daily` stores a channel in `GuildData.footballChannelID`. `services/REST/espn.service.ts` fetches ESPN's public `soccer/all/scoreboard` for the requested day and the next (ESPN's day boundary differs from Bogota's), caches it for 10 minutes, and `espn.normalizer.ts` keeps only the leagues in `src/config/football-competitions.ts`, matched by the numeric league id inside each event `uid`. To track another league, add one line there. `services/football/` builds the embeds and the daily post, which is sent at most once per day per server (`GuildData.footballLastPostDate`).

**i18n.** `languages/en.json` and `es.json` are grouped by feature (for example `FOOTBALL`), with the key unions typed in `src/types/config/translations.type.ts`. Read them with `interaction.translate('GROUP', guildDB.lang)`, or `guild.translate('GROUP', client.guildData)` outside an interaction, and fill placeholders with `.replace('${name}', value)`. Both files must define the same keys. Slash command names and descriptions stay English.

**Other pieces.** `src/workers/` holds the image/GIF render workers and the SIATA radar job. `src/runtime/presence.ts` and `services/presence.service.ts` drive the rotating status (Open-Meteo weather, AI usage, music). Most time-based logic hardcodes `America/Bogota`.

## Conventions

- Imports use the `@/*` alias (`src/*`) and `@languages/*`; SWC rewrites them at build time. Import from the barrel (`@/types`, `@/services`, `@/utils`, `@/mongodb`) unless the module is deliberately kept out of it. ESLint enforces the order: builtin, external, `@/` internal, then relative, alphabetized, with blank lines between groups.
- Bot replies are embeds built with `Info`, `Success`, `Warning` and `Error` from `@/utils`, not plain `content`.
- Every user-facing string goes through `languages/`, never hardcoded in a command.
- Comments only for a non-obvious reason; no docs that restate the code.
- Commit messages follow `type: lowercase summary` (`feat:`, `fix:`, `chore:`), and no `Co-Authored-By` or other attribution trailer.

## Tests

Node's built-in runner, files named `*.test.cjs` under `tests/{unit,integration,contracts,platform}`; pick the suite by dependency boundary (see `tests/README.md`). There is no E2E suite and nothing connects to real Discord, Mongo or cloud APIs. Keep logic that needs testing in modules that import little: a unit test can `require('@/...')` through the TypeScript helper, or for modules with heavy imports (such as `cron-manager.service.ts`) transform the file with `@swc/core` and run it in a `vm` context with mocked `require` entries. Such a mock is keyed by the exact import specifier, so changing an import path in the source means updating the test.
