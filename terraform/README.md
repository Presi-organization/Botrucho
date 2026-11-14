# GCP deployment

## The simple model

- **Local:** `docker compose up --build`.
- **CI:** install, test, build and prune in Debian 13 / Node 26, matching the existing VM.
- **Upload:** `dist/`, production `node_modules/`, `package.json`, encrypted `.env.production` and protected key-only `.env.keys`.
- **GCP:** systemd runs the same pinned dotenvx CLI used by Docker. It decrypts configuration, then starts Node.

There is **one application secret**, `DOTENV_PRIVATE_KEY_PRODUCTION`. Application settings stay in encrypted `.env.production`, not in individual GitHub Secrets. SSH access credentials remain separate.

```text
terraform/
  main.tf                 # Calls only module.gcp
  variables.tf
  outputs.tf
  imports.tf              # Adopts the existing VM; does not create another
  terraform.tfvars.example
  modules/
    gcp/                  # VM, firewall, startup and systemd
    portainer/            # Preserved Docker/SSH alternative, inactive
```

There is no `infra/` directory. Do not apply this root over an old Docker-managed Terraform state without planning its migration: removing old resource declarations can propose destroying them. No state migration is performed automatically.

## Resources and costs

The verified existing instance is **`discord-bot-vm`**, project **`discord-bot-514515`**, zone **`us-east1-b`**: running `e2-micro`, Debian 13 x86_64, **20 GB `pd-standard`**, default VPC. Its current IP `34.139.124.53` uses **PREMIUM**; the desired configuration changes it to **STANDARD**, as approved. The IP can change. No second VM, snapshots, load balancer or NAT gateway is intended.

Machine/disk use is eligible for Always Free within account-wide allowances. **That does not guarantee a zero bill:** external IPv4 currently costs **USD 0,005/hour**, approximately USD 3.60 per 30 days before credits/exemptions. Transfer costs depend on destination, tier and usage. Configure billing budgets and alerts.

Sources: [Free Tier](https://cloud.google.com/free/docs/free-cloud-features#compute), [VPC/IPv4 pricing](https://cloud.google.com/vpc/network-pricing).

## 1. Prepare GCP and a new SSH key

Requirements: Terraform >=1.7, Google Cloud CLI, a billing-enabled project, Compute permissions and the existing VM/network. Use an updated repository checkout in **Cloud Shell** (which already has gcloud), or install Google Cloud CLI locally first. Commands below use Bash. Terraform runs outside CI; the deployment workflow needs no GCP service-account credential.

Generate a key outside the repo. Choose another filename if it already exists:

```bash
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
test ! -e "$HOME/.ssh/botrucho-gcp"
ssh-keygen -t ed25519 -f "$HOME/.ssh/botrucho-gcp" -C botuser -N ''
chmod 600 "$HOME/.ssh/botrucho-gcp"
gcloud auth login
gcloud auth application-default login
gcloud config set project discord-bot-514515
gcloud auth application-default set-quota-project discord-bot-514515
gcloud services enable compute.googleapis.com --project discord-bot-514515
```

Never commit a private SSH key. The formerly committed `terraform/botrucho` key remains in history: revoke its authorization wherever it was used.

## 2. Adopt and plan changes to the existing VM

```bash
cd terraform
test ! -e terraform.tfvars
cp terraform.tfvars.example terraform.tfvars
```

The example already contains your project/instance identifiers. Replace **only the `ssh_public_key` placeholder** with the complete contents of `~/.ssh/botrucho-gcp.pub` (the `.pub` file, never the private key). Keep any existing tfvars file rather than overwriting it.

```bash
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan -out=deploy.tfplan
terraform show -no-color deploy.tfplan
```

**Stop here and review the plan before applying.** `imports.tf` must import this exact resource:

```text
projects/discord-bot-514515/zones/us-east1-b/instances/discord-bot-vm
```

The VM must be imported/updated **in place**, not added as a second instance, destroyed or replaced. The deletion guard rejects instance replacement; if Terraform reports `must be replaced`, `prevent_destroy`, an unexpected VM creation or an import error, stop and investigate rather than remove the guard. If this VM is already managed in another Terraform state, stop and migrate that ownership first.

Also inspect the **complete VM diff**, not just the counts. Stop for unexpected service-account, Shielded VM, IP-forwarding, deletion-protection or stop-required changes. Do not enable `allow_stopping_for_update` merely to silence an error. The agent has no GCP credentials and cannot establish the real plan's behavior from validation alone.

**SSH safety:** the desired metadata installs the new `botuser` key, disables OS Login and blocks project-wide SSH keys. Other existing instance metadata/SSH entries may be removed by reconciliation. Before applying, review those removals, confirm your public key matches your private key, and retain project-owner/API recovery access. Keep a trusted session where possible, but do not rely on an external-IP SSH session surviving the tier change. Do not apply a metadata diff that removes your only administrative/recovery route.

Check whether the proposed firewall name already exists:

```bash
gcloud compute firewall-rules describe discord-bot-vm-ssh \
  --project discord-bot-514515 --format="yaml(name,network,direction,targetTags,sourceRanges,allowed)"
```

`NOT_FOUND` means the new targeted SSH rule can be created as planned. If it exists, inspect its ownership and import/model it deliberately before applying; do not overwrite or delete it blindly. Only the VM is declared in `imports.tf` by default, so an existing unmanaged rule can otherwise cause a create conflict. The new rule also does not narrow broader existing VPC rules.

The original boot image is preserved on adoption. Startup is stored under normal `metadata["startup-script"]`: the provider's separate `metadata_startup_script` attribute can force replacement on changes, so it is intentionally not used.

Check whether the old PREMIUM IP was reserved, without modifying it:

```bash
gcloud compute addresses list --project discord-bot-514515 \
  --filter="address=34.139.124.53" --format="table(name,region,status,networkTier)"
```

An empty result indicates no reservation in this project. A reserved address left unused after migration can incur charges; review its ownership/use before releasing it. This configuration does not automatically delete unrelated address reservations.

Only after the plan is approved:

```bash
terraform apply deploy.tfplan
terraform output -raw vm_external_ip
```

Protect and back up the resulting state; use a protected shared backend if multiple operators work together. This root starts with local state and creates no bucket implicitly. Losing state requires deliberate re-adoption. An import block is not permanent protection against creating a VM after out-of-band deletion; always review later plans too. No import/apply has been run by the coding agent.

Changing startup metadata on an already running VM does not execute it immediately. After applying and reviewing the network/SSH changes, run the startup once through an established trusted SSH session:

```bash
sudo google_metadata_script_runner startup
```

Alternatively, because this instance is confirmed empty, you can deliberately reboot it to run startup. The following command resets/reboots the VM (it is not read-only); do not run it on a VM with active workloads:

```bash
gcloud compute instances reset discord-bot-vm \
  --project discord-bot-514515 --zone us-east1-b
```

Bootstrap creates a 1 GiB swapfile without reformatting an existing file, installs Node 26/runtime libraries once, creates `botuser`, configures restricted sudo and enables systemd. It does **not** build the bot or install npm packages. Wait for completion before deployment. `HOST_KEY_ED25519=` at the end of startup output indicates that setup reached its final step; inspect startup errors if it is absent. The bot itself starts only after CI uploads its files and key.

`ssh_source_ranges` defaults to `0.0.0.0/0` for dynamic GitHub-hosted runner addresses. Restrict it with fixed-egress runners. Inspect `default-allow-ssh` too: a restrictive new rule does not override an existing broader allow rule. Host verification and key-only access are mandatory.

GCE Guest Agent adds metadata SSH users to `google-sudoers`. Bootstrap explicitly excludes `botuser` from that blanket grant and permits only service restart/status in its own sudoers file. Verify `sudo -n /usr/bin/id` is denied for botuser. Do not add Docker/LXD or other privileged groups without reviewing this policy.

## 3. Verify the SSH host identity

Startup prints only the **public** host key with prefix `HOST_KEY_ED25519=`. Obtain it through the authenticated API or trusted console:

```bash
gcloud compute instances get-serial-port-output discord-bot-vm \
  --project discord-bot-514515 --zone us-east1-b \
  | grep 'HOST_KEY_ED25519='
```

Construct one known-hosts line:

```text
VM_IP ssh-ed25519 BASE64_HOST_PUBLIC_KEY
```

This is the VM's host key, **not** your deployment user's public key. Verify its fingerprint with `ssh-keygen -lf` on your trusted local file. Do not blindly trust `ssh-keyscan` or disable host checking.

## 4. Configure four GitHub Secrets

| Secret                          | Purpose                                                                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DOTENV_PRIVATE_KEY_PRODUCTION` | Existing dotenvx production private key: its 64 hexadecimal characters only, not the entire `.env.keys` file. The only application secret required by CI. |
| `VM_HOST`                       | Terraform's public IPv4; update it if the ephemeral IP changes.                                                                                           |
| `VM_SSH_PRIVATE_KEY`            | Complete new deployment SSH private key, including headers.                                                                                               |
| `VM_SSH_KNOWN_HOSTS`            | The single verified host-key line from step 3.                                                                                                            |

Application settings—including `DISCORD_TOKEN`, `CLIENT_ID`, `MONGO_URI`, `AISPEECH_TOKEN`, `RIOT_TOKEN`, `WEBHOOK_ID` and historical `WEBOOK_TOKEN`—come from encrypted `.env.production`. Update it with dotenvx and commit only encrypted configuration, never decrypted values/private keys.

The runner creates `.env.keys` containing **only** the private key, mode 600, and removes it afterward. It is transferred over verified SSH, not uploaded as an artifact, committed, embedded in Terraform state or baked into an image. The VM copy remains mode 600 for startup. Root, the service account or a compromised VM can still recover runtime secrets; encryption is not a defense against machine compromise.

Enable **Server Members Intent** in Discord Developer Portal. Presence/Message Content are not required by the current routes. Check voice/channel/thread permissions separately.

## 5. Build and deploy

Pushes and PR merges to **master** run `.github/workflows/deploy.yml`. Pushing a feature branch does not deploy; merge it into the repository's existing `master` branch when ready.

`npm run build` performs TS7 checking, SWC compilation and explicit asset/language copying. Entrypoint: **`dist/src/sharder.js`**. Production working directory: **`/opt/discord-bot/dist`**, containing assets/languages. SWC rewrites aliases; production needs no alias hook.

Native modules are installed in Debian 13 x86_64 with Node 26, matching the VM. CI prunes dev dependencies before upload. A pinned rsync action uses the separate trusted known-hosts file; a pinned SSH action verifies its fingerprint before restart. The restart action is separate because the transfer action's built-in remote-script option does not preserve our host-verification requirement.

Deployment is deliberately **in-place**, with no custom release manager or automatic rollback. Files can change while the old process runs; restart follows a successful upload. A failed transfer can leave a partial update. Recover by redeploying a known-good commit. The final check confirms systemd is active, not that every external Discord/Mongo/API operation works.

Before the first rollout, stop every old bot instance, particularly versions without the current shard leases. Portainer remains an inactive alternative.

## Runtime and operations

Systemd reads the key-only `/opt/discord-bot/.env.keys` and executes:

```text
/opt/discord-bot/node_modules/.bin/dotenvx run --strict -f /opt/discord-bot/.env.production -- /usr/bin/node --max-old-space-size=512 /opt/discord-bot/dist/src/sharder.js
```

Strict mode stops before Node if decryption fails. The unit defaults `NODE_ENV=production` and **`SHARDS=1`**, overriding legacy encrypted shard settings for this VM. Compose uses the same single-shard default. Other settings, including optional `PORT`, stay in the encrypted file.

```bash
systemctl is-active discord-bot
sudo systemctl status discord-bot
sudo systemctl restart discord-bot
```

An administrator can inspect `sudo journalctl -u discord-bot -n 100 --no-pager` and set global journal retention. No application log files or deployment-history directories grow in the app folder.

Memory caps are starting guardrails, not capacity proof. The manager's 512 MiB heap cap, shard caps, dotenvx, native buffers and ffmpeg all count toward service memory use. Load-test music/rendering before release. System/Node updates are deliberate administrative work rather than network-dependent operations on every reboot.

## Validate without deploying

```bash
nvm use
npm ci
npm run lint
npm test
npm run build
docker build -f docker/Dockerfile.ci -t botrucho:checks .
cd terraform
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
```

See [tests/README.md](../tests/README.md). Synthetic dotenvx checks use fresh temporary keys and no real credentials. Live cloud permissions, quotas, Discord/Mongo connectivity and load behavior require staging verification. Re-run `npm audit --omit=dev`; direct dependency upgrades do not eliminate every transitive advisory.
