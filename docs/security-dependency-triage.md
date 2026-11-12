# Production dependency and supply-chain triage

**Later Node26/TS7 migration update:** the report below is the original pre-upgrade snapshot. Direct dependencies have since been updated to verified stable versions, the old youtubei.js override and incompatible typescript-eslint were removed, and the final production audit reports **39 entries: 0 critical, 33 high, 5 moderate, 1 low**. Current infrastructure lives only in `terraform/`, activating `modules/gcp`; the former Docker path is inactive in `modules/portainer`. Use `terraform/README.md` and the current lockfile for deployment instructions. Remaining advisories are not waived by a successful build.

**Subsequent dotenvx simplification:** unused `@dotenvx/dotenvx-pro` was replaced with direct pinned core `@dotenvx/dotenvx` 2.38.2 so Docker and systemd share one runtime CLI. The latest production audit is **34 entries: 0 critical, 29 high, 4 moderate, 1 low**. GitHub now requires only the dotenvx application key plus three SSH access settings; no plaintext application environment is reconstructed.

Date: 2026-11-12. Package manager: npm (`package-lock.json`). Scope: read-only dependency triage; the user explicitly chose **no dependency updates** in this pass. The SSH key cleanup and event ObjectId/typecheck fix are separate changes.

## Result: fail release gate

`npm audit --omit=dev --json` reported **49 affected package entries: 2 critical, 36 high, 10 moderate, 1 low**. These are dependency-graph entries, not 49 independently exploitable vulnerabilities; Jimp's transitive graph accounts for many repeated high entries. No exploit was demonstrated, and dependency presence is not proof of reachability. Conversely, limited reachability is not proof of safety.

| Area               | Status                            | Evidence                                                                                                                                                                                       |
| ------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project setup      | Warning                           | Committed npm lockfile exists. `.npmrc` absent. Critical runtime dependencies use ranges in `package.json:22-42`. Publish permissions/2FA cannot be verified locally.                          |
| Dependency hygiene | Fail                              | 49 production audit entries; critical Mongoose and proxy-addr. Existing `youtubei.js` override at `package.json:19-21`; native binaries and downloads need deliberate install-script handling. |
| CI/CD              | Fail                              | No audit/test/typecheck gate in `.github/workflows/master_bot.yml:15-50`; Docker uses npm install at `docker/Dockerfile:9,36`; unpinned installer at line 33 and unpinned yt-dlp at line 21.   |
| Dependabot         | Warning / remote settings unknown | `.github/dependabot.yml` absent. Repository alert settings, notification routing, and branch protection are not visible from local files.                                                      |
| Incident response  | Fail pending operator action      | Private key removed from checkout, but historical exposure remains; server-side revocation is not done. No complete credential-rotation/publisher incident playbook found.                     |

## Critical findings

### Mongoose 9.4.1

- Declaration: `package.json:40`. Fixed-version candidate verified with npm metadata: **9.11.4**, same major; requires Node >=20.19.0 (project image is Node 24).
- The audit includes sanitizeFilter failures, inherited-property/prototype pollution problems, and hydration/merge paths. Examples: [GHSA-pcrw-h46h-c93h](https://github.com/advisories/GHSA-pcrw-h46h-c93h), [GHSA-gg4r-jv3p-qx3c](https://github.com/advisories/GHSA-gg4r-jv3p-qx3c), [GHSA-8332-j7wj-wjw4](https://github.com/advisories/GHSA-8332-j7wj-wjw4).
- Actual usage: `src/runtime/instance-lease.ts:11,23`, `src/mongodb/controllers/CronData.ts:32-48`, `src/mongodb/controllers/GuildData.ts:14-25`. Lease filters/updates are internally built, not arbitrary supplied MongoDB operators. Cron metadata comes from modal JSON and is persisted (`editCron.handler.ts:125-131`); it still needs strict schema/size/key validation. The specific critical countDocuments/sanitizeFilter path was not found in application code. Other Mongoose paths remain in use; do not mark the package safe based only on that absence.
- Proposed change, **not applied**:

```json
"mongoose": "9.11.4"
```

Update only that package and its necessary transitives with scripts disabled during resolution; review lockfile changes and run real MongoDB ownership/CRUD regressions before release.

### proxy-addr 2.0.7 via Express 5.2.1

- Direct parent: `package.json:35`. Installed dependency path: `express -> proxy-addr`. [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) reports IP spoofing through mapped-IPv6 trust-subnet handling.
- **2.0.8** is a verified patched candidate and satisfies Express 5.2.1's existing `^2.0.7` constraint. Express 5.3.0 also declares `^2.0.8`, but upgrading Express is not necessary solely to resolve this transitive version.
- Application reachability: `src/sharder.ts:32-34` creates only the health server; no `trust proxy`, `req.ip`, `req.ips`, or IP-based authorization was found. Express defaults to no trusted proxy. This reduces exposure to the reported trust-subnet scenario; it does not remove the audit finding or cover future changes.
- Proposed remediation, **not executed**:

```sh
npm update proxy-addr --ignore-scripts
npm ls proxy-addr
npm test
```

Review the resulting lockfile; require all installed proxy-addr copies to be >=2.0.8. No blanket major-version overrides.

## Other significant chains

| Chain                                                              | Usage / reachable-risk assessment                                                                                                                                                                                  | Proposed remediation (not applied)                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jimp@1.6.0 -> @jimp/* -> zod@3.25.76 / file-type`                 | `src/commands/searching/tftelo.command.ts:9,132-135` only reads and re-encodes bundled local rank PNGs. No user-controlled image bytes found in this path. Many high entries propagate from the same zod advisory. | Avoid decoding/re-encoding: attach the existing trusted PNG path and remove Jimp after regression tests. Do not force zod 4 into a zod 3 consumer.                                                                                                                                          |
| Discord REST/player/YouTube extractors -> multiple undici versions | External HTTP responses and streaming are reachable; RAM-related advisories matter on a 1 GB VM. Copies observed: 5.29.0, 6.24.1, 7.24.7.                                                                          | Resolve per-major consumer compatibility. Verified candidates: 6.29.1 (Node >=18.17), 7.30.1 (Node >=20.18.1). Discord.js 14.28.1 metadata was verified; it still declares a range, so inspect its actual resolved transitive version. Do not replace every major with one global override. |
| `@dotenvx/dotenvx-pro -> systeminformation@5.31.5 / undici@5.29.0` | No direct application import of systeminformation or dotenvx-pro; production CMD uses the separately installed dotenvx binary. Package and CLI are distinct supply-chain surfaces.                                 | Verify which CLI npm scripts actually need, then remove/upgrade unnecessary pro dependency in a separately tested change. Avoid assuming the binary inherits npm-package fixes.                                                                                                             |
| `ws@8.20.0` through Discord/Azure/jsdom                            | WebSocket and voice-related workloads are used; frame-flood/uninitialized-memory advisories should not be dismissed.                                                                                               | Resolve to patched same-major version satisfying all consumer ranges, then test Discord reconnection/audio.                                                                                                                                                                                 |
| Azure speech -> uuid; Express -> body-parser/qs                    | Azure speech is used; body-parser middleware is not mounted on the current health-only server.                                                                                                                     | Target compatible parent/transitive fixes. Test speech callbacks and HTTP health handling; keep request-body parsing disabled unless needed.                                                                                                                                                |

Audit `fixAvailable: false` means npm has no supported automatic remediation for that chain; it does not mean every advisory lacks a patched version.

## Supply-chain findings and remediation snippets

- **Docker installs are not lockfile-enforced** (`docker/Dockerfile:9,36`). After checking lockfile consistency, replace with:

  ```dockerfile
  RUN npm ci --include=dev
  # Production stage:
  RUN npm ci --omit=dev
  ```

  A stricter follow-up should use `--ignore-scripts` plus a tested explicit rebuild allowlist for canvas/SWC/esbuild/yt-dlp tooling. Do not disable scripts globally without ensuring native binaries still install.

- **No security gate** (`.github/workflows/master_bot.yml:15-50`). Before image publication, add test/typecheck/audit stages after a lockfile-enforced install:

  ```yaml
  - run: npm test
  - run: npx --no-install tsc --noEmit --ignoreDeprecations 6.0
  - run: npm audit --omit=dev --audit-level=high
  ```

  The audit gate currently fails by design until advisories are remediated or narrowly documented exceptions are accepted. Avoid turning the existing deployment workflow into an unconditional bypass.

- **Missing version-update configuration** (`.github/dependabot.yml` absent). Suggested baseline:

  ```yaml
  version: 2
  updates:
    - package-ecosystem: npm
      directory: /
      schedule:
        interval: weekly
      open-pull-requests-limit: 5
  ```

  This config schedules version updates; enable security alerts/updates and notification recipients separately in repository settings. Pin existing GitHub Actions by verified commit SHA when the deployment workflow is modularized.

- **Hardcoded Portainer webhook credential** (`.github/workflows/master_bot.yml:50`). Move to a secret during the optional-module change:

  ```yaml
  - run: curl --fail --show-error --silent -X POST "$PORTAINER_WEBHOOK_URL"
    env:
      PORTAINER_WEBHOOK_URL: ${{ secrets.PORTAINER_WEBHOOK_URL }}
  ```

  Rotate the historical webhook token if exposed. No webhook call or secret rotation was performed here.

## Incident handling and release order

1. Revoke the historical SSH public key on the server. `terraform/botrucho.example` intentionally contains no key; configure a new external path explicitly.
2. Approve targeted dependency changes, starting with Mongoose and proxy-addr; regenerate/review the lockfile without automatic major changes.
3. Re-run production audit, full tests, typecheck, Linux image build, native/audio imports, and real MongoDB lease/CRUD tests.
4. Remediate reachable HTTP/WebSocket/image dependency chains. Re-scan after each change rather than reporting original counts as current.
5. Add CI gates, pinned/reproducible installation, Dependabot notifications and documented credential-rotation owners before production release.

No package.json dependency ranges, lockfile resolutions, or installed dependencies were changed by this triage. The previous working-tree dependency upgrades are user work and were preserved.
