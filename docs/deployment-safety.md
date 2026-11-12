# Deployment safety notes

## Release blockers and first rollout

1. Revoke/rotate the SSH key previously committed at `terraform/botrucho`. It has now been deleted from the checkout, replaced by non-secret `terraform/botrucho.example`, and ignored. Deletion does not revoke the key or remove git history. Configure `ssh_private_key_path` explicitly to a real key outside this repository.
2. Stop every old bot instance before starting this version. Old heartbeat-based versions do not honor the new shard leases. Do not mix versions during the first rollout.
3. Enable **Server Members Intent** in Discord's Developer Portal. Presence intent is no longer requested. Message-content intent is not needed by the current slash-command/thread workflows.
4. The pre-existing `IEventData.id` typecheck error is fixed in the follow-up: attendance now uses a typed persisted `_id`. Keep the typecheck as a release gate.

## Process and ownership model

Keep ShardingManager process mode; `SHARDS` defaults to 1 and must be a positive integer. Application ID and shard ID identify a lease; a fresh process UUID identifies its owner. MongoDB atomic conditional upserts serialize acquisition. Lease expiry is 30 seconds, serialized renewal runs every 10 seconds, and startup retries contention for up to 40 seconds. An expired owner cannot renew or release another owner's lease. MongoDB TTL deletion is only garbage collection, not the locking algorithm.

The manager waits up to 90 seconds for initial Discord readiness. It registers listeners before spawning, tolerates transient disconnects, and exits nonzero on shard death or failed startup. Automatic discord.js respawn is disabled: Docker owns restart/backoff for the whole process tree. Fatal uncaught exceptions/rejections exit through bounded cleanup, rather than silently continuing in an unknown state.

SIGTERM/SIGINT trigger idempotent cleanup. The manager requests child shutdown over IPC and waits for real process exit, with SIGTERM fallback and SIGKILL after 10 seconds. The shard has an 8-second cleanup budget, manager 12 seconds, and Docker 15 seconds. Cleanup stops timers and cron schedules, drains tracked cron jobs, closes audio/Discord, releases the owned lease, and disconnects MongoDB. Hung cleanup can exhaust the deadline; the lease then expires naturally.

Unready children receive SIGTERM directly so an IPC message cannot be lost before their listeners load. A pending claim is awaited before owner-scoped release, subject to the overall shutdown deadline. Cron drain is limited to 2 seconds so a stuck job does not prevent audio/Discord/database cleanup. If cron work fails to drain, shutdown exits nonzero and deliberately retains the lease until expiry to avoid handing ownership to a replacement while old work may still run. Clock-based leases assume synchronized clocks on any replacement host.

## Resource defaults

| Setting | Default | Scope |
| --- | --- | --- |
| `memory_mb` | 700 | Entire container: manager, all shards, native buffers and ffmpeg children |
| memory + swap | same as memory | No extra container swap allowance |
| `cpu_limit` | 0.5 | Docker CPU quota; shared host capacity is not guaranteed |
| manager old-space | 96 MiB | JavaScript old generation only |
| shard old-space | 256 MiB | Per shard, not total container RSS |
| `bind_address` | `127.0.0.1` | Published health endpoint interface |
| Docker logs | 10 MiB x 3 | json-file rotation |

These are conservative starting guardrails, **not measured proof of fitness for 1 GB**. More shards multiply memory use. Canvas, ffmpeg, native Buffers and yt-dlp are not capped by V8 old-space flags. Profile `docker stats` during playback/rendering before release. The optional Portainer path can set `BOT_BIND_ADDRESS` if remote health access is required; do not expose it publicly by default.

## Terraform deployment and secrets

Terraform remains primary; CI/Portainer workflow behavior is unchanged in this pass. Container replacement pulls the image, gracefully stops the old container, removes it without force, then starts the new one. There is downtime and no automatic rollback: review `terraform plan` before applying. Changes to image ID and resource settings trigger replacement of the deployment provisioner.

`runtime_env_path` defaults to `.config/botrucho/runtime.env` relative to the SSH user's home. Terraform establishes restrictive parent/file permissions before uploading the dotenvx decryption key, then Docker reads it with `--env-file`. The key is no longer interpolated into the remote shell command. This **does not hide it from Terraform state, root, or Docker inspect**. Protect and encrypt state, limit Docker access, and remove obsolete environment files manually after path changes. Validate the remote SSH host identity out of band; the legacy Terraform SSH connection still needs an explicitly trusted host key for verified host authentication. The destroy command now requires a trusted local known_hosts entry.

Do not pass real credentials into tests. No credentials were decrypted, rotated, or deployed during this pass.

## Health and verification

The HTTP endpoint returns 503 until all shards complete application initialization and after readiness loss; 200 means ready. The image healthcheck allows 120 seconds of startup grace. **Docker does not restart unhealthy containers automatically**; fatal runtime conditions must exit nonzero. Readiness is not a continuous external dependency probe: a later Mongo outage is detected through lease renewal, and a stuck event loop still requires external monitoring.

Run offline regression tests with `npm test`. Tests use the locally installed SWC only to load TypeScript; type checking is separate. Lease tests use an atomic in-memory adapter and are not a substitute for testing concurrency against MongoDB. Required release checks include a Linux container build, SIGTERM smoke test through dotenvx/init, and live staging startup/shutdown with disposable Discord/Mongo resources. Do not use production credentials for smoke tests.

Local verification on this pass: Linux/amd64 image build passed; native canvas/application import smoke passed; network-isolated SIGTERM and SIGINT fixtures through init/dotenvx and the built lifecycle/supervisor helpers exited child and manager with code 0. This does not constitute a real Discord/Mongo end-to-end startup test. The image build's npm output reported 49 production dependency vulnerabilities, including 2 critical; review advisories/reachability and remediate before release. No automated dependency upgrades were applied.

The follow-up production audit confirmed the same 49 entries and documents actual dependency paths, reachability limits, compatible fix candidates, and five-area supply-chain findings in [security-dependency-triage.md](security-dependency-triage.md). The user chose report-only dependency triage; versions remain unchanged.

## Deferred follow-up

- Bounded render concurrency/timeouts, unique media files, speech file cleanup, queue/callback resource limits.
- Bounded deleted-message storage and cache tuning without breaking attendance member discovery.
- HTTP timeouts/retries/caching, presence rotation and monthly egress measurements.
- Permission enforcement and the optional Portainer module.
- Pinning dependency/install-script supply chain, non-root container hardening, and complete SSH host authentication configuration.
- No changes here establish that music/GIF workloads fit the RAM or 1 GB/month outbound budget.
