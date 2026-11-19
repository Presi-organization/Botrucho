# Server operations over SSH

Day-to-day commands for the production VM. The bot runs as the systemd unit `discord-bot` (user `botuser`, app in `/opt/discord-bot`). Setup and host verification are in [terraform/README.md](../terraform/README.md).

Set the connection once per terminal session. Use the same SSH user and host the deploy workflow uses (`VM_HOST`), and a key whose host is already in your `known_hosts`:

```bash
VM="<ssh-user>@<vm-host>"
```

Commands that change the service need `sudo`. Read-only ones (`status`, `journalctl`) usually do not.

## Service control

| Goal | Command |
| --- | --- |
| Status | `ssh $VM 'systemctl status discord-bot --no-pager'` |
| Is it running? | `ssh $VM 'systemctl is-active discord-bot'` |
| Start | `ssh $VM 'sudo systemctl start discord-bot'` |
| Stop | `ssh $VM 'sudo systemctl stop discord-bot'` |
| Restart | `ssh $VM 'sudo systemctl restart discord-bot'` |
| Keep it off after a reboot | `ssh $VM 'sudo systemctl disable discord-bot'` (undo with `enable`) |

- The unit uses `Restart=always`, so only an explicit `stop` keeps it down. The next deploy runs `systemctl restart` and brings it back.
- Shutdown is graceful and capped at 15 seconds (`TimeoutStopSec`). A slow stop usually means the instance lease is being released; wait before starting it again.
- The bot is ready only when every shard is connected, so `is-active` alone does not prove Discord and Mongo work. Check the logs after a restart.

## Logs

Everything goes to the journal under `discord-bot`.

```bash
ssh $VM 'sudo journalctl -u discord-bot -n 100 --no-pager'        # last 100 lines
ssh $VM 'sudo journalctl -u discord-bot -f'                        # follow live (Ctrl+C to stop)
ssh $VM 'sudo journalctl -u discord-bot --since "1 hour ago" --no-pager'
ssh $VM 'sudo journalctl -u discord-bot -p err --since today --no-pager'   # errors only
ssh $VM 'sudo journalctl -u discord-bot -b --no-pager | grep -i "AI mention"'
```

The unit rate-limits logging to 1000 lines per 30 seconds, so a burst can drop lines.

## Music diagnostics

`VOICE_DIAGNOSTICS=1` makes the bot log `[VoiceDiagnostics]` records (voice state, per-second CPU, event-loop delay, buffer depth). It is off by default and is switched with a systemd drop-in. Turning it on or off restarts the bot, so do it when nobody is listening to music.

Enable:

```bash
ssh $VM 'sudo mkdir -p /etc/systemd/system/discord-bot.service.d && printf "[Service]\nEnvironment=VOICE_DIAGNOSTICS=1\n" | sudo tee /etc/systemd/system/discord-bot.service.d/voice-diagnostics.conf >/dev/null && sudo systemctl daemon-reload && sudo systemctl restart discord-bot'
```

Watch only the diagnostics:

```bash
ssh $VM 'sudo journalctl -u discord-bot -f' | grep --line-buffered VoiceDiagnostics
```

Disable:

```bash
ssh $VM 'sudo rm -f /etc/systemd/system/discord-bot.service.d/voice-diagnostics.conf && sudo systemctl daemon-reload && sudo systemctl restart discord-bot'
```

Check whether it is currently on:

```bash
ssh $VM 'systemctl show discord-bot -p Environment --value | tr " " "\n" | grep VOICE_DIAGNOSTICS || echo off'
```

Leave it off when you are done: the per-second samples add log volume and a little CPU on the e2-micro.

## Resource checks

```bash
ssh $VM 'systemctl show discord-bot -p MemoryCurrent -p MemoryHigh -p MemoryMax -p NRestarts'
ssh $VM 'top -b -n 1 -u botuser | head -15'
```

The unit is capped at 700 MB soft and 850 MB hard memory (`MemoryHigh` / `MemoryMax`). A rising `NRestarts` means the process is dying and systemd is restarting it every 10 seconds.
