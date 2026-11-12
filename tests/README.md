# Tests

Tests use **Node 26's built-in runner**, not Jest or Vitest. Files end in `.test.cjs` and are organized by the boundary they exercise.

## Where to look

- **`unit/`** — functions with in-memory dependencies: leases, shutdown/timers, interaction errors and shard supervision.
- **`integration/`** — HTTP on loopback, startup/attendance with mocked APIs, and the real dotenvx CLI with synthetic encrypted configuration and process shutdown probes.
- **`contracts/`** — aliases/build settings, environment variables, workflow requirements, Terraform layout, documentation and ignored secrets. Some invoke the compiler; none provision cloud resources.
- **`platform/`** — real sudo policy and systemd validation inside a disposable Linux container.
- **`helpers/`** — test-only TypeScript/alias loading. Not a suite.
- **`fixtures/`** — supporting subprocess programs launched by integration tests, not independently discovered test files.

**There is no E2E suite.** Nothing here connects to real Discord, MongoDB, Azure or GCP. Lease tests model database atomicity in memory; they do not prove real MongoDB concurrency. Add E2E coverage only with explicitly isolated staging resources and credentials.

## Commands

Run from the repository root with Node 26:

```bash
npm test                   # Every category
npm run test:unit          # Function-level behavior
npm run test:integration   # Local orchestration / subprocesses
npm run test:contracts     # Repository and configuration contracts
npm run test:platform      # Guarded Linux policy check
```

Run one file or filter a name:

```bash
node --test tests/unit/lifecycle.test.cjs
node --test --test-name-pattern=heartbeat "tests/unit/**/*.test.cjs"
```

Native quoted globs discover nested tests on Windows and Linux without a custom runner. Place new tests under a suite directory; keep helpers/fixtures free of `.test.cjs` files. The layout contract catches unclassified tests.

Configuration contracts verify the encrypted artifact, single application key and pinned transfer/SSH actions. Integration tests create temporary encrypted files and keys, prove decryption/fail-closed behavior with the actual CLI, and check signal forwarding without loading Discord or MongoDB.

## Linux checks and safety

- The two POSIX signal-forwarding tests are skipped on Windows. Encryption/decryption tests run on both platforms and never read the project's real `.env.keys` or decrypt real application settings.
- The OpenSSH fingerprint integration check also runs on Linux with freshly generated temporary test keys; it never connects to a server.
- `platform/linux-policy.test.cjs` requires Linux and `BOT_VERIFY_SUDO=1`. It writes sudoers files in its test environment. **Never enable that flag on your workstation or a real VM.**
- Run every category safely in the disposable verification image:

  ```bash
  docker build -f docker/Dockerfile.ci -t botrucho:checks .
  ```

  The build runs clean installation, lint, tests, typecheck/build, pruning and production import checks. It does not deploy or contact Discord/MongoDB.

- Ignore-policy tests require a Git checkout. The verification image creates an empty repository rather than copying project history.
- `fixtures/signal-probe.cjs` is a manager/child signal fixture, not a live bot or E2E test.

## Adding tests

1. Pick a category by dependency boundary, not by whether the filename happens to mention a service.
2. Name the file after the component/contract and each test after observable behavior.
3. Use fake credentials and temporary directories; never production resources.
4. Preserve behavior checks when moving files.
5. Run the relevant category, then `npm test` and `npm run lint`.
