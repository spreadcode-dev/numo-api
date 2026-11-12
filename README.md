# numo-api

[![PR Validation](https://github.com/spreadcode-dev/numo-api/actions/workflows/pr-validation.yml/badge.svg)](https://github.com/spreadcode-dev/numo-api/actions/workflows/pr-validation.yml)

NuMo's REST API, built with NestJS (TypeScript, ESM). For now it runs locally only.

## Prerequisites

- [nvm](https://github.com/nvm-sh/nvm) and **Node 26** (pinned in `.nvmrc`)
- **Corepack**, which provides the pinned Yarn version. Node 25+ no longer bundles it, so install it once per Node installation.
- **Yarn 4** via Corepack (pinned in `package.json` → `packageManager`). Don't use npm: there must be no `package-lock.json`.

## Setup

```bash
nvm install && nvm use
npm install -g corepack   # once per Node installation
corepack enable
yarn install --immutable  # also installs the Git pre-commit hook
```

Check: `node -v` prints `v26.x` and `yarn -v` prints `4.x`. If `yarn -v` prints `1.x`, the wrong Node version is active (run `nvm use`) or a global Yarn 1 (e.g. Homebrew) is earlier on your `PATH`.

## Run

```bash
cp .env.example .env                    # once; then set your own local passwords
openssl rand -base64 48                 # once; paste it as JWT_ACCESS_SECRET in .env (the API won't start without it)
docker compose up -d                    # Postgres (see Database below)
yarn start:dev                          # watch mode on http://localhost:3000
curl -i http://localhost:3000/health    # → 200 {"status":"ok"}
curl -i http://localhost:3000/health/db # → 200 {"status":"ok","database":"up"}
open http://localhost:3000/docs         # API docs (Swagger UI), see API documentation below
```

Environment variables are listed in [`.env.example`](.env.example). The app loads `.env` on startup (`@nestjs/config`); variables already set in the process environment win, e.g. `PORT=4000 yarn start:dev`.

## API documentation

Interactive OpenAPI (Swagger) docs are generated from the controllers by [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction):

| URL                             | What it is                                                   |
| ------------------------------- | ------------------------------------------------------------ |
| http://localhost:3000/docs      | Swagger UI: browse the endpoints and try them ("Try it out") |
| http://localhost:3000/docs-json | The raw OpenAPI 3 document                                   |

The title is `NuMo API` and the version comes from `package.json`. Set `SWAGGER_ENABLED=false` to turn both URLs off (they answer `404`); any other value, or none, keeps them on.

**Convention for new endpoints:** every endpoint must show up correctly in `/docs` before its PR is merged.

- Describe request and response bodies with classes in `*.dto.ts` files, not `type` aliases. The [CLI plugin](https://docs.nestjs.com/openapi/cli-plugin) (enabled in [`nest-cli.json`](nest-cli.json)) turns their properties into schemas at build time.
- Add `@nestjs/swagger` decorators only for what the plugin can't infer, mostly error responses (e.g. `@ApiServiceUnavailableResponse` on `GET /health/db`).
- Reviewers open `/docs` and check the new endpoint.

## Database

Postgres 17 runs locally in a container ([`docker-compose.yml`](docker-compose.yml)), with its data in a named volume. It needs Docker running. Docker Compose reads the same `.env` file as the API. Don't use `$` in `.env` values: Docker Compose treats it as a variable reference.

| Command                  | What it does                                               |
| ------------------------ | ---------------------------------------------------------- |
| `docker compose up -d`   | Starts Postgres on `localhost:${DB_PORT}` (default `5432`) |
| `docker compose ps`      | Shows the `postgres` service; wait for `healthy`           |
| `docker compose stop`    | Stops the container and keeps the data                     |
| `docker compose down`    | Removes the container and keeps the data (volume)          |
| `docker compose down -v` | **Resets everything**: removes the volume and all data     |
| `yarn db:users`          | Re-runs the users script (idempotent; container must run)  |
| `yarn db:schema`         | Applies the schema script (idempotent; container must run) |

### Users (least privilege)

| Role                  | Used by                          | Can                                               |
| --------------------- | -------------------------------- | ------------------------------------------------- |
| `numo_superuser`      | Setup and emergencies only       | Everything (owns the container and `numo_db`)     |
| `numo_migration_user` | Schema script (`yarn db:schema`) | DDL on schema `public`                            |
| `numo_app_user`       | The API at runtime, and only it  | `SELECT`, `INSERT`, `UPDATE`; no `DELETE`, no DDL |

[`db/users.sql`](db/users.sql) creates the roles and grants. It runs automatically on the container's **first boot** (empty volume) through [`db/init-users.sh`](db/init-users.sh), with passwords from `.env`. After changing the script or a password, run `yarn db:users` (or `docker compose down -v && docker compose up -d` to start from scratch). Tables created by `numo_migration_user` are automatically readable and writable by `numo_app_user` (`ALTER DEFAULT PRIVILEGES FOR ROLE numo_migration_user`).

Connect with `psql` from your machine (e.g. `brew install libpq`); it asks for the password from `.env`:

```bash
psql -h localhost -U numo_migration_user -d numo_db
psql -h localhost -U numo_app_user -d numo_db
docker compose exec postgres psql -U numo_superuser -d numo_db   # superuser, from inside the container
```

Inside the container, connections from `localhost` are trusted without a password, so only a connection from your machine checks the passwords. In `psql`, `\du` lists the roles and `\l` the databases. To check the privileges by hand:

```sql
-- as numo_migration_user
CREATE TABLE smoke_test (id serial PRIMARY KEY, name text);   -- OK
-- as numo_app_user
INSERT INTO smoke_test (name) VALUES ('hello');               -- OK
SELECT * FROM smoke_test;                                     -- OK
DELETE FROM smoke_test;                                       -- permission denied
CREATE TABLE x (id int);                                      -- permission denied
-- as numo_migration_user, to clean up
DROP TABLE smoke_test;
```

### Schema

There is no migration tool: [`db/schema.sql`](db/schema.sql) is a single idempotent script (`CREATE ... IF NOT EXISTS`), applied as `numo_migration_user` by [`db/init-schema.sh`](db/init-schema.sh), so `numo_app_user` gets access to new tables through the default privileges above. It runs automatically on the container's first boot, right after the users script. After changing it, or on a volume created before it existed, run:

```bash
yarn db:schema   # safe to run again: existing objects are skipped ("already exists, skipping")
```

Later changes go at the end of the script as `ALTER ... IF NOT EXISTS` or guarded `DO $$` blocks, never by editing a `CREATE` that already ran.

| Table            | Columns                                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users`          | `id` (uuid), `email` (unique, case-insensitive), `password_hash` (argon2id), `created_at`, `updated_at`                                                                                                            |
| `refresh_tokens` | `id` (uuid), `user_id` (→ `users`), `family_id` (one per login), `token_hash` (SHA-256 hex, unique), `expires_at`, `revoked_at` (empty while active), `replaced_by_id` (→ the token that rotated it), `created_at` |

### API connection

The API connects only as `DB_APP_USER` through a `pg` pool ([`src/shared/database`](src/shared/database)), closed on shutdown. `GET /health/db` runs `SELECT 1`:

```bash
curl -i http://localhost:3000/health/db  # → 200 {"status":"ok","database":"up"}
docker compose stop postgres
curl -i http://localhost:3000/health/db  # → 503 {"status":"error","database":"down"}; the API keeps running
docker compose start postgres
```

## Registration

`POST /auth/register` creates an account from `{ email, password }`. The email is trimmed and lowercased; the password must be 12–128 characters, with no composition rules (NIST/OWASP), and is stored only as an argon2id hash. Unknown body fields are rejected (global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`). It needs the schema applied (`yarn db:schema`).

```bash
curl -i -X POST localhost:3000/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"Ana@Example.com","password":"correct-horse-battery"}'
# → 201 {"id":"…","email":"ana@example.com","createdAt":"…","updatedAt":"…"}
```

| Status | When                                                                      |
| ------ | ------------------------------------------------------------------------- |
| `201`  | Account created; the response never includes the password or its hash     |
| `400`  | Invalid email, password outside 12–128 characters, or an unexpected field |
| `409`  | The email is already registered (any capitalisation)                      |

To see the stored hash: `docker compose exec postgres psql -U numo_app_user -d numo_db -c 'SELECT email, password_hash FROM users;'` (it starts with `$argon2id$`). `numo_app_user` can't delete rows, so remove test accounts as the superuser: `docker compose exec postgres psql -U numo_superuser -d numo_db -c "DELETE FROM users WHERE email = 'ana@example.com';"`.

## Login

`POST /auth/login` checks `{ email, password }` and returns a short-lived access token (JWT, HS256, signed with `JWT_ACCESS_SECRET`). Send it as `Authorization: Bearer <token>` to protected routes. It also sets a `refresh_token` cookie that renews the session without the password (see [Session: refresh and logout](#session-refresh-and-logout)).

```bash
curl -i -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"correct-horse-battery"}'
# → 200 {"accessToken":"eyJ…","tokenType":"Bearer","expiresIn":900}

TOKEN=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"correct-horse-battery"}' | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')
curl -i localhost:3000/auth/me -H "Authorization: Bearer $TOKEN"
# → 200 {"id":"…","email":"ana@example.com"}
```

| Status | When                                                                                                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `200`  | Login succeeded, or `/auth/me` with a valid token                                                                                       |
| `400`  | Login: invalid email format or an unexpected field                                                                                      |
| `401`  | Login: wrong password **or** unknown email (same message, same response time). `/auth/me`: missing, expired, tampered or unsigned token |

The token's payload holds `sub` (the user id), `iss: numo-api`, `aud: numo-web`, `iat` and `exp`. To read it locally: `echo "$TOKEN" | cut -d. -f2 | base64 -d` (add `=` padding if `base64` complains). In `/docs`, log in with "Try it out", click **Authorize** and paste the `accessToken` to call protected routes from the UI.

| Variable            | Required | Default | What it is                                                                                          |
| ------------------- | -------- | ------- | --------------------------------------------------------------------------------------------------- |
| `JWT_ACCESS_SECRET` | yes      | none    | Signs the tokens; at least 32 bytes (`openssl rand -base64 48`). The API refuses to start otherwise |
| `JWT_ACCESS_TTL`    | no       | `15m`   | Token lifetime: a positive number followed by `s`, `m` or `h`                                       |

**Every route needs a token by default.** A global guard (`JwtAuthGuard`) checks all routes; mark a route or a whole controller with `@Public()` (from [`src/shared/auth`](src/shared/auth)) to opt out, as `/health`, `/health/db`, `/auth/register`, `/auth/login`, `/auth/refresh` and `/auth/logout` do (the last two are authenticated by their cookie instead). Add `@ApiBearerAuth()` to protected routes so `/docs` sends the token.

## Session: refresh and logout

Login also sets a **refresh token** in a cookie, so the session can be renewed without the password:

- **Opaque and random** (256 bits, base64url), not a JWT. The database stores only its SHA-256 hash (`refresh_tokens.token_hash`), never the value. It expires after **7 days**.
- **Cookie:** `refresh_token`, with `HttpOnly` (page scripts can't read it), `Secure` and `SameSite=Strict` (browsers treat `localhost` as secure), and `Path=/auth` (sent only to the auth routes).
- **Rotation:** every `POST /auth/refresh` revokes the presented token and issues a new one in the same _family_ (the chain that started with one login).
- **Reuse detection:** presenting a token that was already rotated revokes every token in its family and answers `401`. Someone kept a copy, so that session ends everywhere.

```bash
# Log in and keep the cookie in a jar
curl -i -c jar.txt -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"correct-horse-battery"}'
# → 200 {"accessToken":"eyJ…",…} + Set-Cookie: refresh_token=…; Path=/auth; HttpOnly; Secure; SameSite=Strict

# Renew: new access token + rotated cookie (-b sends the jar, -c saves the new cookie)
curl -i -b jar.txt -c jar.txt -X POST localhost:3000/auth/refresh
# → 200 {"accessToken":"eyJ…",…} + a different refresh_token cookie

# End the session: the token is revoked and the cookie cleared
curl -i -b jar.txt -c jar.txt -X POST localhost:3000/auth/logout
# → 204
```

| Status | `POST /auth/refresh`                                                      | `POST /auth/logout`                                 |
| ------ | ------------------------------------------------------------------------- | --------------------------------------------------- |
| `200`  | New access token in the body, rotated cookie                              |                                                     |
| `204`  |                                                                           | Always: token revoked (if valid) and cookie cleared |
| `401`  | No cookie, or an unknown, expired, revoked or reused token (same message) |                                                     |

**For clients (`numo-web`):** send refresh calls one at a time. Two parallel refreshes with the same cookie look like token reuse, and the second one ends the session.

Revoked and expired rows stay in `refresh_tokens` (the app user has no `DELETE` grant). A cleanup job is planned separately.

## Quality checks

| Command             | What it does                                                         |
| ------------------- | -------------------------------------------------------------------- |
| `yarn test`         | Unit tests (Vitest, `*.spec.ts` next to the code)                    |
| `yarn test:cov`     | Unit tests with coverage in `coverage/`; fails below 80% (see below) |
| `yarn lint`         | Oxlint; fails on any error or warning                                |
| `yarn typecheck`    | `tsc --noEmit` across the project                                    |
| `yarn format`       | Prettier on the whole repo (writes fixes)                            |
| `yarn format:check` | Prettier on the whole repo (check only, as in CI)                    |
| `yarn build`        | Compiles to `dist/`                                                  |

The coverage gate (80% of lines, branches, functions and statements) is set in [`vitest.config.ts`](vitest.config.ts), so it fails the same way locally and in CI. Coverage is measured over all of `src/`, except bootstrap/wiring files (`src/main.ts`, `*.module.ts`).

## Continuous integration

Every pull request targeting `main` (or `develop`) runs the **PR Validation** workflow ([`.github/workflows/pr-validation.yml`](.github/workflows/pr-validation.yml)), job `node-ci`, on the Node version from `.nvmrc` and the Yarn version from `packageManager`:

1. `yarn install --immutable`
2. `yarn format:check`
3. `yarn lint`
4. `yarn typecheck`
5. `yarn test:cov` (80% coverage gate)
6. `yarn build`

Run the same gate locally before opening a PR:

```bash
yarn format:check && yarn lint && yarn typecheck && yarn test:cov && yarn build
```

The HTML coverage report is uploaded as the `coverage-report` artifact of each workflow run (Actions → run → **Artifacts**), also when a test or the coverage gate fails.

The workflow uses a read-only `GITHUB_TOKEN`, pins third-party actions to commit SHAs and cancels outdated runs on the same branch. It needs no secrets.

### Branch protection

`main` requires the `node-ci` and `validate-release-tag` checks to pass before a PR can be merged, and the rule applies to admins too (no bypass). GitHub counts a skipped job as passed, so `validate-release-tag` only blocks release PRs. GitHub only offers a check as required after it has run once, so a repository admin sets it once, after the first workflow run (for `validate-release-tag`, the first release PR):

```bash
gh api -X PUT repos/spreadcode-dev/numo-api/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["node-ci", "validate-release-tag"] },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null
}
JSON
```

Check it with `gh api repos/spreadcode-dev/numo-api/branches/main/protection/required_status_checks`.

### PR checks

The same workflow also checks the conventions from [`CLAUDE.md`](CLAUDE.md) on every pull request. The rules live in small Bash scripts in [`.github/scripts/`](.github/scripts/), each tested by a Vitest spec next to it.

| Job                    | Rule                                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validate-branch`      | The source branch is `main`, `develop`, `release/<version>` (e.g. `release/1.2.3`) or `<type>/<issue-number>-<slug>`, lowercase and hyphenated.                                 |
| `validate-commit`      | The PR has **exactly one commit**, and every non-merge commit is titled `#<issue-number>: <description>`. `release/*` → `main` and `main` → `develop` may have several commits. |
| `validate-release-tag` | Only for `release/*` → `main`: the `version` in `package.json` hasn't been released yet (no `tag_v-<version>.*` tag on GitHub). Skipped for every other PR.                     |

Allowed `<type>` prefixes: `feature`, `bugfix`, `hotfix`, `chore`, and `ai`, `copilot`, `cursor`, `claude`, `codex` for branches created by AI tools.

To squash a PR into one commit:

```bash
git fetch origin
git reset --soft $(git merge-base origin/<base-branch> HEAD)
git commit -m "#<issue-number>: <description>"
git push --force-with-lease
```

Run a check locally, e.g. `HEAD_REF=my-branch bash .github/scripts/validate-branch.sh`. Making `validate-branch` and `validate-commit` required checks is part of the GitFlow branch protection setup.

## Releases

Every push to `main` is tagged `tag_v-<version>.<build>` by the **Release** workflow ([`.github/workflows/release.yml`](.github/workflows/release.yml)). `<version>` comes from `package.json` and `<build>` is the commit's UTC time as `YYYYMMDDHHMM`, e.g. `tag_v-0.1.0.202611101845`. The build part keeps tags unique even when a hotfix doesn't bump the version. Re-running the workflow for the same commit skips the existing tag. There's no deploy yet: the tag is the release.

To release:

1. Cut `release/x.y.z` from `develop`.
2. Bump the version on it: `yarn version x.y.z` (or `yarn version patch|minor|major`), then commit `#<issue-number>: Release x.y.z`.
3. Open a PR into `main`. `validate-release-tag` fails if `x.y.z` was already released.
4. Merge it with a **merge commit**. The Release workflow tags the merge commit.
5. Review and merge the `main` → `develop` sync PR that opens automatically (see below).

For a hotfix, branch `hotfix/<issue-number>-<slug>` from `main`, bump the patch version in the same commit as the fix, and open a PR into `main`.

List releases with `git ls-remote --tags origin 'tag_v-*'`, or check one version locally with `bash .github/scripts/validate-release-tag.sh <version>`.

### main → develop sync

After every push to `main` (release or hotfix), the **Sync main into develop** workflow ([`.github/workflows/sync-main-develop.yml`](.github/workflows/sync-main-develop.yml)) checks whether `develop` is missing commits from `main`. If it is, it opens a PR `Sync Release <version> (main into develop)` and lists the missing commits in the run log. If `develop` is up to date it does nothing, and if a sync PR is already open it doesn't open another: the open PR picks up the new commits. It never pushes to `develop` or merges by itself.

- **Merge the sync PR with a merge commit**, not squash, to keep the release history on `develop`.
- **No CI runs on it.** PRs opened with the workflow's `GITHUB_TOKEN` don't trigger other workflows, so PR Validation doesn't run. The commits were already validated on their way to `main`, so review it and merge it by hand. If `develop` ever requires status checks, the sync PR can't get them and needs an admin merge (or a PAT/GitHub App, not set up).
- **Required repo setting:** "Allow GitHub Actions to create and approve pull requests" (Settings → Actions → General); without it `gh pr create` fails. Check it with `gh api repos/spreadcode-dev/numo-api/actions/permissions/workflow` (`can_approve_pull_request_reviews: true`), and enable it with:

```bash
gh api -X PUT repos/spreadcode-dev/numo-api/actions/permissions/workflow \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true
```

## Pre-commit hook

`yarn install` sets up [Husky](https://typicode.github.io/husky/) through the `postinstall` script (Yarn 2+ doesn't run `prepare`). On every `git commit`, [lint-staged](https://github.com/lint-staged/lint-staged) runs on the **staged** files only:

- `*.ts`: `oxlint --fix`, then `prettier --write`
- `*.json`, `*.md`, `*.yml`: `prettier --write`

Fixed files are added back to the commit automatically. If a lint error can't be fixed automatically, the commit is blocked until you fix it.

## Project structure

```
src/
  main.ts            # bootstrap
  app.module.ts      # imports feature modules
  modules/<feature>/
    domain/          # entities, value objects, domain errors, repository ports
    application/     # use cases
    infrastructure/  # DB/ORM, external clients (implement domain ports)
    presentation/    # controllers, request/response DTOs
    <feature>.module.ts
  shared/            # small cross-cutting pieces
    database/        # pg pool (app user), closed on shutdown
    openapi/         # Swagger setup (/docs)
    auth/            # @Public() decorator (opt out of the global JwtAuthGuard)
db/                  # Postgres users and schema scripts, and their container init wrappers
```

Dependencies point inward: presentation/infrastructure → application → domain. A feature only creates the layers it needs (`health` has no `domain/`: its `DatabaseHealthIndicator` port lives in `application/` and the `pg` adapter in `infrastructure/`). `auth` uses all four: `Email`/`Password` value objects, refresh-token rules and the `UserRepository`/`PasswordHasher`/`AccessTokenIssuer`/`AccessTokenVerifier`/`RefreshTokenRepository`/`RefreshTokenGenerator`/`Clock` ports in `domain/`; `RegisterUserUseCase`, `LoginUseCase`, `GetCurrentUserUseCase`, `RefreshSessionUseCase` and `LogoutUseCase`, plus the `RefreshTokens` and `SessionIssuer` helpers they share, in `application/` (plain classes, built by factories in `auth.module.ts`); the `pg` repositories, argon2 hasher, JWT adapter, crypto token generator and system clock in `infrastructure/`; and the `AuthController` (account) and `SessionController` (login, refresh, logout), refresh-token cookie helpers, error mapper, global `JwtAuthGuard` and `@CurrentUser()` in `presentation/`.
