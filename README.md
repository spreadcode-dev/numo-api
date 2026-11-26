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
docker compose up -d postgres           # Postgres only (see Database below)
yarn start:dev                          # watch mode on http://localhost:3000
curl -i http://localhost:3000/health    # → 200 {"status":"ok"}
curl -i http://localhost:3000/health/db # → 200 {"status":"ok","database":"up"}
open http://localhost:3000/docs         # API docs (Swagger UI), see API documentation below
```

Environment variables are listed in [`.env.example`](.env.example). The app loads `.env` on startup (`@nestjs/config`); variables already set in the process environment win, e.g. `PORT=4000 yarn start:dev`.

## Run in containers

The whole backend can also run in Docker, built like a production image ([`Dockerfile`](Dockerfile): compiled `dist/` and production dependencies only, as the non-root `node` user). The `api` container reads the same `.env` (secrets are never baked into the image), reaches Postgres by service name, and is published on `localhost:${API_CONTAINER_PORT}` (default `3100`), so it runs alongside `yarn start:dev` on 3000.

```bash
docker compose up -d --build            # builds the API image, starts postgres + api
docker compose ps                       # wait until both are healthy
curl -i http://localhost:3100/health    # → 200 {"status":"ok"}
curl -i http://localhost:3100/health/db # → 200 {"status":"ok","database":"up"}
```

| Command                            | What it does                                                               |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `docker compose up -d --build api` | Rebuilds and restarts the API after code changes (no hot reload inside it) |
| `docker compose logs -f api`       | Follows the API logs                                                       |
| `docker compose stop api`          | Stops only the API, closing its database pool; Postgres keeps running      |

The `curl` examples below use port 3000 (host mode); against the container, use 3100. numo-web can point at it with `NUMO_API_URL=http://localhost:3100`.

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

| Command                         | What it does                                               |
| ------------------------------- | ---------------------------------------------------------- |
| `docker compose up -d postgres` | Starts Postgres on `localhost:${DB_PORT}` (default `5432`) |
| `docker compose ps`             | Shows the services; wait for `healthy`                     |
| `docker compose stop`           | Stops the container and keeps the data                     |
| `docker compose down`           | Removes the container and keeps the data (volume)          |
| `docker compose down -v`        | **Resets everything**: removes the volume and all data     |
| `yarn db:users`                 | Re-runs the users script (idempotent; container must run)  |
| `yarn db:schema`                | Applies the schema script (idempotent; container must run) |

### Users (least privilege)

| Role                  | Used by                          | Can                                                                                                      |
| --------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `numo_superuser`      | Setup and emergencies only       | Everything (owns the container and `numo_db`)                                                            |
| `numo_migration_user` | Schema script (`yarn db:schema`) | DDL on schema `public`                                                                                   |
| `numo_app_user`       | The API at runtime, and only it  | `SELECT`, `INSERT`, `UPDATE`; `DELETE` only on `labels`, `transactions` and `transaction_labels`; no DDL |

[`db/users.sql`](db/users.sql) creates the roles and grants. It runs automatically on the container's **first boot** (empty volume) through [`db/init-users.sh`](db/init-users.sh), with passwords from `.env`. After changing the script or a password, run `yarn db:users` (or `docker compose down -v && docker compose up -d` to start from scratch). Tables created by `numo_migration_user` are automatically readable and writable by `numo_app_user` (`ALTER DEFAULT PRIVILEGES FOR ROLE numo_migration_user`). `DELETE` is never a default: [`db/schema.sql`](db/schema.sql) grants it table by table, only where users can delete rows (today, `labels`, `transactions` and `transaction_labels`), with `GRANT DELETE ON <table> TO :"app_user";` right after the table (`db/init-schema.sh` passes `app_user`).

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

| Table                | Columns                                                                                                                                                                                                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`              | `id` (uuid), `email` (unique, case-insensitive), `password_hash` (argon2id), `created_at`, `updated_at`                                                                                                                                                                                                                                               |
| `refresh_tokens`     | `id` (uuid), `user_id` (→ `users`), `family_id` (one per login), `token_hash` (SHA-256 hex, unique), `expires_at`, `revoked_at` (empty while active), `replaced_by_id` (→ the token that rotated it), `created_at`                                                                                                                                    |
| `transactions`       | `id` (uuid), `user_id` (→ `users`), `account_id` (→ `accounts`), `date` (calendar day, no time zone), `amount` (bigint signed cents, never `0`), `description` (1–140), `transfer_id` (shared by the two legs of a transfer, empty otherwise), `created_at`, `updated_at`; indexed on `(user_id, date DESC, id DESC)`, `account_id` and `transfer_id` |
| `transaction_labels` | `transaction_id` (→ `transactions`), `label_id` (→ `labels`), primary key on both; deleting either side removes the link (`ON DELETE CASCADE`); indexed on `label_id`                                                                                                                                                                                 |
| `labels`             | `id` (uuid), `user_id` (→ `users`), `name` (1–30, unique per user, case-insensitive), `color` (`#rrggbb`, lowercase; the palette is checked by the API, not the DB), `created_at`, `updated_at`                                                                                                                                                       |
| `accounts`           | `id` (uuid), `user_id` (→ `users`), `name` (1–60, unique per user, case-insensitive), `type` (named `CHECK`: `checking`, `savings`, `credit_card`, `cash`, `investment`), `currency` (`BRL` only), `opening_balance` (bigint cents), `archived_at` (empty while active), `created_at`, `updated_at`                                                   |

### API connection

The API connects only as `DB_APP_USER` through a `pg` pool ([`src/shared/database`](src/shared/database)), closed on shutdown. A connection that Postgres drops (restart, stop) is logged, not fatal: the pool opens a new one on the next query. `GET /health/db` runs `SELECT 1`:

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

## Rate limiting

`POST /auth/login` and `POST /auth/register` accept at most **5 requests per minute per IP, per route** (login and registration have separate budgets). The next request gets `429 Too Many Requests` with a `Retry-After` header (seconds until the window frees up). No other route is limited, and accounts are never locked: a lockout would let anyone block a real user by guessing wrong on purpose.

| Variable              | Default | Meaning                                               |
| --------------------- | ------- | ----------------------------------------------------- |
| `AUTH_THROTTLE_LIMIT` | `5`     | Requests allowed per IP and route within the window   |
| `AUTH_THROTTLE_TTL`   | `1m`    | Window length: `<number>` followed by `s`, `m` or `h` |

An invalid value stops the API at startup.

```bash
for i in $(seq 6); do curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"nobody@example.com","password":"wrong-password-123"}'; done
# → 401 ×5, then 429 (curl -i shows Retry-After)
```

Start with `AUTH_THROTTLE_TTL=10s yarn start:dev` to watch the window reset quickly.

Counters live in memory: they reset when the API restarts and are not shared between instances (a shared store such as Redis is needed once several instances run). Behind a reverse proxy every client would share the proxy's IP; Express `trust proxy` must be configured when a hosted environment exists.

## Accounts

`POST /accounts` registers where the user's money is (a bank account, credit card, cash or investment) with an opening balance. `GET /accounts` lists the caller's active accounts sorted by name, ignoring case and accents; `?includeArchived=true` adds the archived ones. `PATCH /accounts/:id` edits any of `name`, `type` and `openingBalance`, and `POST /accounts/:id/archive` / `POST /accounts/:id/unarchive` hide and restore an account. All need a token, and every query is scoped to the user in it, so another user's accounts are never visible: their ids answer `404`, like unknown ones. All need the schema applied (`yarn db:schema`).

- **Money is signed integer cents**, never a float: `-150000` is −R$ 1,500.00. Values beyond `Number.MAX_SAFE_INTEGER` are rejected.
- **`type`** is one of `checking`, `savings`, `credit_card`, `cash`, `investment`. A credit card is a plain account whose balance usually goes negative.
- **`currency`** is optional and must be `BRL` (the default).
- **`name`** is trimmed, 1–60 characters, and unique per user in any casing.
- **`balance`** is computed, not stored: `openingBalance` plus the sum of the account's [transactions](#transactions).
- **`archivedAt`** appears only on archived accounts. Accounts are never deleted (the app's database user has no `DELETE` grant): archiving hides an account from the default list but keeps it, and its history, in place. Archiving or unarchiving twice is harmless and keeps the first archive date.
- **Editing `openingBalance` is a correction**, not a transaction: the balance is computed from it, so it changes by the same amount. `currency` can't be edited (`400`).

```bash
curl -i -X POST localhost:3000/accounts -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Nubank card","type":"credit_card","openingBalance":-150000}'
# → 201 {"id":"…","name":"Nubank card","type":"credit_card","currency":"BRL","openingBalance":-150000,"balance":-150000}

curl -i localhost:3000/accounts -H "Authorization: Bearer $TOKEN"
# → 200 [{"id":"…","name":"Nubank card",…,"balance":-150000}]

curl -i -X PATCH localhost:3000/accounts/$ACCOUNT_ID -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Itaú checking"}'
# → 200 {"id":"…","name":"Itaú checking",…}

curl -i -X POST localhost:3000/accounts/$ACCOUNT_ID/archive -H "Authorization: Bearer $TOKEN"
# → 200 {…,"archivedAt":"2026-11-25T21:42:23.146Z"}

curl -i 'localhost:3000/accounts?includeArchived=true' -H "Authorization: Bearer $TOKEN"
# → 200 [ …archived accounts included… ]

curl -i -X POST localhost:3000/accounts/$ACCOUNT_ID/unarchive -H "Authorization: Bearer $TOKEN"
# → 200 {…} (no archivedAt)
```

`TOKEN` comes from [Login](#login); `ACCOUNT_ID` is the `id` returned by `POST /accounts`.

| Status | When                                                                                                                                                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `201`  | `POST /accounts`: account created                                                                                                                                                                                                    |
| `200`  | `GET`: the caller's accounts (`[]` if none); `PATCH`, `archive`, `unarchive`: the account, also when it was already archived or active                                                                                               |
| `400`  | Unknown `type`, name empty or over 60 characters, non-integer `openingBalance`, `currency` other than `BRL` on create or any `currency` on edit, a `null` field, an unexpected field, or `includeArchived` other than `true`/`false` |
| `401`  | Missing, expired or invalid token                                                                                                                                                                                                    |
| `404`  | `PATCH`, `archive`, `unarchive`: no account with that id for the caller (unknown, another user's, or not a UUID)                                                                                                                     |
| `409`  | `POST`, `PATCH`: the user already has another account with that name (any casing)                                                                                                                                                    |

## Transactions

`POST /transactions` records an income or an expense on one of the caller's accounts, `GET /transactions` lists them (see [Listing and paging](#listing-and-paging)), and `PUT`/`DELETE /transactions/:id` fix or remove one (see [Editing and deleting](#editing-and-deleting)). All need a token and the schema applied (`yarn db:schema`). Every transaction moves the account's `balance` in `GET /accounts`.

- **`amount`** is signed integer cents and never `0`: **negative is an expense, positive is an income**. `-4590` is −R$ 45.90.
- **`date`** is a calendar day, `YYYY-MM-DD`, with no time zone (`2026-02-30` is rejected). It's returned exactly as sent.
- **`description`** is trimmed and 1–140 characters.
- **`accountId`** must be one of the caller's accounts and not archived. Unarchive an account to record on it again.

```bash
curl -i -X POST localhost:3000/transactions -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"accountId\":\"$ACCOUNT_ID\",\"date\":\"2026-11-20\",\"amount\":-4590,\"description\":\"Market\"}"
# → 201 {"id":"…","accountId":"…","date":"2026-11-20","amount":-4590,"description":"Market","labels":[]}

curl -i localhost:3000/accounts -H "Authorization: Bearer $TOKEN"
# → 200 [{"id":"…",…,"openingBalance":100000,"balance":95410}]
```

| Status | When                                                                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `201`  | Transaction recorded                                                                                                                                         |
| `400`  | `amount` is `0` or not an integer, `date` isn't a real `YYYY-MM-DD` day, `description` outside 1–140 characters, `accountId` not a UUID, an unexpected field |
| `401`  | Missing, expired or invalid token                                                                                                                            |
| `404`  | No account with that id for the caller (unknown or another user's)                                                                                           |
| `409`  | The account is archived                                                                                                                                      |

### Listing and paging

`GET /transactions` lists the caller's transactions **newest first** (by `date`, then `id` to break ties). Every filter is optional and they combine with AND:

| Parameter   | What it does                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------- |
| `accountId` | Only that account's transactions. Another user's account gives `{"items":[]}`, never an error       |
| `labelId`   | Only transactions tagged with that label. Another user's label gives `{"items":[]}`, never an error |
| `from`      | First day included, `YYYY-MM-DD`                                                                    |
| `to`        | Last day included, `YYYY-MM-DD`                                                                     |
| `limit`     | Page size, 1–100 (default `50`)                                                                     |
| `cursor`    | The `nextCursor` of the previous page, passed back unchanged                                        |

The response is `{ "items": [...], "nextCursor": "…" }`. `nextCursor` is **absent on the last page**. Paging is keyset-based, not `OFFSET`: the cursor is an opaque, versioned encoding of the last row's `(date, id)`, so pages stay stable when transactions are added meanwhile, and it uses the `(user_id, date DESC, id DESC)` index. Keep the same filters while following a cursor.

```bash
curl -s 'localhost:3000/transactions?from=2026-11-01&to=2026-11-30&limit=20' -H "Authorization: Bearer $TOKEN"
# → 200 {"items":[{"id":"…","accountId":"…","date":"2026-11-20","amount":-4590,"description":"Market","labels":[{"id":"…","name":"Trip","color":"#2563eb"}]},…],"nextCursor":"djF8…"}

# Follow every page (needs jq)
CURSOR=''
while :; do
  PAGE=$(curl -s "localhost:3000/transactions?limit=50${CURSOR:+&cursor=$CURSOR}" -H "Authorization: Bearer $TOKEN")
  echo "$PAGE" | jq -c '.items[]'
  CURSOR=$(echo "$PAGE" | jq -r '.nextCursor // empty')
  [ -z "$CURSOR" ] && break
done
```

| Status | When                                                                                                                                                                                |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200`  | A page of the caller's transactions (`{"items":[]}` if none match)                                                                                                                  |
| `400`  | `limit` outside 1–100 or not a whole number, a tampered or outdated `cursor`, `from`/`to` not a real `YYYY-MM-DD` day, `accountId` or `labelId` not a UUID, an unexpected parameter |
| `401`  | Missing, expired or invalid token                                                                                                                                                   |

### Editing and deleting

`PUT /transactions/:id` replaces a transaction with the **full body** (`{ accountId, date, amount, description }`, every field required), checked with the same rules as recording: the target `accountId` must be one of the caller's accounts and not archived. That means a transaction can be moved off an archived account onto an active one, but not edited while it stays on an archived one. `DELETE /transactions/:id` removes it for good (there is no undo), whether or not its account is archived. Both update the account's `balance` right away. A replace keeps the transaction's labels; deleting a transaction removes its labels with it. Another user's transaction, an unknown id or an id that isn't a UUID all answer `404`. A transfer leg answers `409` on both routes: change it through [Transfers](#transfers).

```bash
curl -i -X PUT localhost:3000/transactions/$TRANSACTION_ID -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"accountId\":\"$ACCOUNT_ID\",\"date\":\"2026-11-20\",\"amount\":-5000,\"description\":\"Market\"}"
# → 200 {"id":"…","accountId":"…","date":"2026-11-20","amount":-5000,"description":"Market","labels":[…]}   (balance moves by -410 from -4590)

curl -i -X DELETE localhost:3000/transactions/$TRANSACTION_ID -H "Authorization: Bearer $TOKEN"
# → 204, and the balance goes back
```

| Status | When                                                                                                           |
| ------ | -------------------------------------------------------------------------------------------------------------- |
| `200`  | `PUT`: transaction replaced                                                                                    |
| `204`  | `DELETE`: transaction deleted                                                                                  |
| `400`  | `PUT`: same body rules as `POST /transactions`, a missing field, or an unexpected one                          |
| `401`  | Missing, expired or invalid token                                                                              |
| `404`  | No transaction with that id for the caller (unknown, another user's, or not a UUID); `PUT`: or no such account |
| `409`  | `PUT`: the target account is archived; either route: the transaction is a transfer leg                         |

### Labels on transactions

Every transaction carries `labels` (always an array, sorted by name ignoring case and accents, `[]` when untagged) in all its responses. `PUT /transactions/:id/labels` with `{ "labelIds": [...] }` **replaces the whole set**: sending the same set twice changes nothing, and `[]` removes them all. At most 10 different labels per transaction, and each must be one of the caller's labels. It answers `200` with the transaction's labels. Deleting a label (`DELETE /labels/:id`) removes it from every transaction. Filter with `GET /transactions?labelId=` (see [Listing and paging](#listing-and-paging)).

```bash
curl -i -X PUT localhost:3000/transactions/$TRANSACTION_ID/labels -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"labelIds\":[\"$GROCERIES_ID\",\"$TRIP_ID\"]}"
# → 200 [{"id":"…","name":"Groceries","color":"#15803d"},{"id":"…","name":"Trip","color":"#2563eb"}]

curl -s "localhost:3000/transactions?labelId=$TRIP_ID" -H "Authorization: Bearer $TOKEN"
# → 200 {"items":[{…,"labels":[{"id":"…","name":"Groceries",…},{"id":"…","name":"Trip",…}]}]}
```

| Status | When                                                                                                                    |
| ------ | ----------------------------------------------------------------------------------------------------------------------- |
| `200`  | Labels replaced; the body is the transaction's labels                                                                   |
| `400`  | `labelIds` not an array of UUIDs, more than 10 labels, the same label twice, or an unexpected field                     |
| `401`  | Missing, expired or invalid token                                                                                       |
| `404`  | No transaction with that id for the caller (unknown, another user's, or not a UUID), or a label that isn't the caller's |

### Transfers

A transfer moves money between two of the caller's accounts, for example **paying the credit card bill from checking**. Record it with `POST /transfers`, not as an expense: it's stored as **two transactions** that share a `transferId`, `-amount` on `fromAccountId` and `+amount` on `toAccountId`. Both balances move, the caller's total doesn't, and reports leave transfers out so the bill isn't counted as spending twice. Both legs are written by a single SQL statement, so a transfer is never half-saved.

- **`amount`** is positive integer cents; the direction comes from the two accounts.
- **`fromAccountId`** and **`toAccountId`** must be two different accounts of the caller, neither archived.
- **`date`** and **`description`** follow the same rules as a transaction and are used for both legs.

```bash
# Checking at 100000 (R$ 1,000.00), credit card at -150000: pay R$ 500.00 of the bill
curl -i -X POST localhost:3000/transfers -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"fromAccountId\":\"$CHECKING_ID\",\"toAccountId\":\"$CARD_ID\",\"amount\":50000,\"date\":\"2026-11-20\",\"description\":\"Card bill\"}"
# → 201 {"transferId":"…","outgoing":{…,"amount":-50000,"transferId":"…"},"incoming":{…,"amount":50000,"transferId":"…"}}
# GET /accounts → checking 50000, card -100000

curl -i -X DELETE localhost:3000/transfers/$TRANSFER_ID -H "Authorization: Bearer $TOKEN"
# → 204, both legs gone and both balances back
```

Both legs show up in `GET /transactions` with their `transferId` (the field is absent on other transactions). They can't be edited or deleted one at a time (`409` on `PUT`/`DELETE /transactions/:id`), since the pair would no longer add up: to change a transfer, delete it and create a new one. Labels can still be set on a leg.

| Status | When                                                                                                                                                                                               |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `201`  | `POST`: transfer created                                                                                                                                                                           |
| `204`  | `DELETE`: both legs deleted                                                                                                                                                                        |
| `400`  | `POST`: `amount` not a positive integer, the same account on both sides, `date` not a real `YYYY-MM-DD` day, `description` outside 1–140 characters, an account id not a UUID, an unexpected field |
| `401`  | Missing, expired or invalid token                                                                                                                                                                  |
| `404`  | `POST`: an account that isn't the caller's; `DELETE`: no transfer with that id for the caller (unknown, another user's, or not a UUID)                                                             |
| `409`  | `POST`: one of the accounts is archived                                                                                                                                                            |

## Labels

Labels are NuMo's only way to classify transactions (there are no separate categories). `POST /labels` creates one from `{ name, color }`, `GET /labels` lists the caller's labels sorted by name (ignoring case and accents), `PATCH /labels/:id` renames and/or recolors one, and `DELETE /labels/:id` removes it. New users have no labels. All need a token and are scoped to its user: another user's labels answer `404`, like unknown ones. They need the schema applied (`yarn db:schema`).

- **`name`** is trimmed, 1–30 characters, and unique per user in any casing.
- **`color`** must be one of the 8 palette colors shared with numo-web. Any casing is accepted; it's stored and returned in lowercase.

| Color  | Hex       |
| ------ | --------- |
| blue   | `#2563eb` |
| green  | `#15803d` |
| teal   | `#0f766e` |
| purple | `#7c3aed` |
| pink   | `#be185d` |
| red    | `#b91c1c` |
| orange | `#f97316` |
| yellow | `#facc15` |

```bash
curl -i -X POST localhost:3000/labels -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Groceries","color":"#15803D"}'
# → 201 {"id":"…","name":"Groceries","color":"#15803d"}

curl -i localhost:3000/labels -H "Authorization: Bearer $TOKEN"
# → 200 [{"id":"…","name":"Groceries","color":"#15803d"}]

curl -i -X PATCH localhost:3000/labels/$LABEL_ID -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Supermarket","color":"#f97316"}'
# → 200 {"id":"…","name":"Supermarket","color":"#f97316"}

curl -i -X DELETE localhost:3000/labels/$LABEL_ID -H "Authorization: Bearer $TOKEN"
# → 204
```

`LABEL_ID` is the `id` returned by `POST /labels`.

| Status | When                                                                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------- |
| `201`  | `POST`: label created                                                                                             |
| `200`  | `GET`: the caller's labels (`[]` if none); `PATCH`: the edited label                                              |
| `204`  | `DELETE`: label deleted                                                                                           |
| `400`  | Name empty or over 30 characters, color outside the palette or not `#RRGGBB`, a `null` field, an unexpected field |
| `401`  | Missing, expired or invalid token                                                                                 |
| `404`  | `PATCH`, `DELETE`: no label with that id for the caller (unknown, another user's, or not a UUID)                  |
| `409`  | `POST`, `PATCH`: the user already has another label with that name (any casing)                                   |

## Reports

Read-only views over the caller's money. They need a token and the schema applied (`yarn db:schema`), and only ever read the token user's data.

### Net worth

`GET /reports/net-worth` answers the caller's net worth and the balance of each account in one call, for the dashboard.

- **`accounts`** lists the caller's **non-archived** accounts as `{ id, name, type, balance }`, highest balance first (same balance, then by name). `balance` is computed exactly as in [`GET /accounts`](#accounts).
- **`total`** is the plain sum of those balances, in cents. A credit card counts negatively because its balance already is, and [transfers](#transfers) cancel out on their own.
- **`currency`** is always `BRL`: one currency per user, so the total needs no conversion.
- **Archiving an account takes its balance out of the total**, even if money is left in it. Bring an account to zero (for example with a transfer) before archiving it to keep net worth unchanged.

```bash
# Checking 100000, savings 250000, credit card -150000
curl -i localhost:3000/reports/net-worth -H "Authorization: Bearer $TOKEN"
# → 200 {"currency":"BRL","total":200000,"accounts":[{"id":"…","name":"Savings","type":"savings","balance":250000},{…,"balance":100000},{…,"type":"credit_card","balance":-150000}]}

# A user without accounts
# → 200 {"currency":"BRL","total":0,"accounts":[]}
```

| Status | When                                                         |
| ------ | ------------------------------------------------------------ |
| `200`  | The net worth (`total: 0` and `accounts: []` if no accounts) |
| `401`  | Missing, expired or invalid token                            |

### Cash flow

`GET /reports/cash-flow` answers the caller's total income and expense for each of the last months, so the dashboard can show whether they spend more than they earn.

- **`months`** (optional, `1`–`24`, default `12`) is how many months to return, ending at **`to`**.
- **`to`** (optional, `YYYY-MM`) is the last month included. It defaults to the **current month in UTC**, which can differ from the user's local month for a few hours around midnight at the turn of a month, so a client that cares sends `to` from the user's own clock.
- The answer has **exactly `months` entries**, oldest first. A month without transactions is `{ income: 0, expense: 0 }`.
- **`income`** is the sum of the month's positive transactions; **`expense`** is the sum of its negative ones, **as a positive number** (ready to chart). Both are integer cents.
- **[Transfers](#transfers) are left out**, so paying the card bill from checking isn't counted as spending. Transactions on archived accounts still count, since they're history.

```bash
# November: +500000 salary, -120000 market, -30000 fuel, plus a transfer to the card
curl -i 'localhost:3000/reports/cash-flow?months=3&to=2026-11' -H "Authorization: Bearer $TOKEN"
# → 200 [{"month":"2026-09","income":0,"expense":0},{"month":"2026-10","income":0,"expense":0},{"month":"2026-11","income":500000,"expense":150000}]

curl -i localhost:3000/reports/cash-flow -H "Authorization: Bearer $TOKEN"
# → 200 [ …12 entries, ending at the current UTC month… ]
```

| Status | When                                                                                                                       |
| ------ | -------------------------------------------------------------------------------------------------------------------------- |
| `200`  | One entry per month, oldest first                                                                                          |
| `400`  | `months` not a whole number between 1 and 24, `to` not a real `YYYY-MM` month (e.g. `2026-13`), or an unexpected parameter |
| `401`  | Missing, expired or invalid token                                                                                          |

### Spending by label

`GET /reports/spending-by-label?month=YYYY-MM` answers how much the caller spent under each [label](#labels) in one month, so they can see where their money goes.

- **`month`** is required.
- Only **expenses** count: the month's negative transactions, as positive amounts. Income and [transfers](#transfers) are left out.
- **Labels overlap.** An expense counts **in full under every label it has**: a R$ 300.00 market run tagged both Food and Trip adds `30000` to Food _and_ `30000` to Trip. The entries can therefore add up to more than was spent; **`total`** is the month's real expense, each transaction counted once, so show it apart from the bars rather than summing them.
- Expenses without labels form one **`Unlabeled`** entry, with no `labelId` and no `color`. It only appears when there is such spending.
- **`labels`** are sorted by `amount`, highest first (same amount, then by name). A month without expenses is `{ "month": "…", "total": 0, "labels": [] }`.

```bash
# November: Rent -200000 (Housing), Market -30000 (Food + Trip), parking -5000 (no label)
curl -i 'localhost:3000/reports/spending-by-label?month=2026-11' -H "Authorization: Bearer $TOKEN"
# → 200 {"month":"2026-11","total":235000,"labels":[
#          {"labelId":"…","name":"Housing","color":"#2563eb","amount":200000},
#          {"labelId":"…","name":"Food","color":"#15803d","amount":30000},
#          {"labelId":"…","name":"Trip","color":"#f97316","amount":30000},
#          {"name":"Unlabeled","amount":5000}]}
```

| Status | When                                                                                       |
| ------ | ------------------------------------------------------------------------------------------ |
| `200`  | The month's spending (`total: 0` and `labels: []` if no expenses)                          |
| `400`  | `month` missing or not a real `YYYY-MM` month (e.g. `2026-13`), or an unexpected parameter |
| `401`  | Missing, expired or invalid token                                                          |

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
    database/        # pg pool (app user), closed on shutdown; isUniqueViolation() for Postgres errors
    config/          # env value parsers shared by modules (durations like 15m)
    openapi/         # Swagger setup (/docs)
    auth/            # @Public() (opt out of the global JwtAuthGuard), @CurrentUser() and AuthenticatedUser
db/                  # Postgres users and schema scripts, and their container init wrappers
```

Dependencies point inward: presentation/infrastructure → application → domain. A feature only creates the layers it needs (`health` has no `domain/`: its `DatabaseHealthIndicator` port lives in `application/` and the `pg` adapter in `infrastructure/`). `auth` uses all four: `Email`/`Password` value objects, refresh-token rules and the `UserRepository`/`PasswordHasher`/`AccessTokenIssuer`/`AccessTokenVerifier`/`RefreshTokenRepository`/`RefreshTokenGenerator`/`Clock` ports in `domain/`; `RegisterUserUseCase`, `LoginUseCase`, `GetCurrentUserUseCase`, `RefreshSessionUseCase` and `LogoutUseCase`, plus the `RefreshTokens` and `SessionIssuer` helpers they share, in `application/` (plain classes, built by factories in `auth.module.ts`); the `pg` repositories, argon2 hasher, JWT adapter, crypto token generator and system clock in `infrastructure/`; and the `AuthController` (account) and `SessionController` (login, refresh, logout), refresh-token cookie helpers, error mapper, global `JwtAuthGuard` and the `@AuthRateLimited()` decorator with its throttling config in `presentation/`. `accounts` follows the same shape: the `AccountName` value object, `AccountType`, `Currency`, cents (`toCents`) and the `AccountRepository` port in `domain/`; `CreateAccountUseCase`, `ListAccountsUseCase`, `UpdateAccountUseCase`, `ArchiveAccountUseCase` and `UnarchiveAccountUseCase` (sharing the `findOwnedAccount` helper) in `application/`; `PgAccountRepository` in `infrastructure/`; and the `AccountsController` with its error mapper in `presentation/`. `transactions` has the `TransactionDate`/`TransactionDescription` value objects, `toTransactionAmount`, the label-id rule (`toTransactionLabelIds`), the transfer rules (`toTransferLegs`, `toTransferAmount`), and the `TransactionRepository`, `TransactionLabelRepository`, `TransferRepository`, `AccountLookup` and `LabelLookup` ports in `domain/` (the lookups ask only what transactions need about an account or label, so the module doesn't reach into `accounts` or `labels`); `RecordTransactionUseCase`, `ListTransactionsUseCase`, `ReplaceTransactionUseCase`, `DeleteTransactionUseCase`, `SetTransactionLabelsUseCase`, `TransferBetweenAccountsUseCase` and `DeleteTransferUseCase` (sharing the `findOwnedTransaction`, `ensureAccountAcceptsTransactions` and `ensureNotTransferLeg` helpers), the `TransactionReader` query port and the page cursor in `application/`; `PgTransactionRepository` (serving both the write and the read port), `PgTransactionLabelRepository`, `PgTransferRepository` (sharing the row mapping in `transaction-row.ts`), `PgAccountLookup` and `PgLabelLookup` in `infrastructure/`; and the `TransactionsController` and `TransfersController` with their shared error mapper in `presentation/`. `labels` too: the `LabelName` and `LabelColor` (palette) value objects and the `LabelRepository` port in `domain/`; `CreateLabelUseCase`, `ListLabelsUseCase`, `UpdateLabelUseCase` and `DeleteLabelUseCase` (sharing `findOwnedLabel`) in `application/`; `PgLabelRepository` in `infrastructure/`; and the `LabelsController` with its error mapper in `presentation/`.

Imports that leave a feature may use the path aliases `@shared/*` and `@modules/*` (set in `tsconfig.json`; `nest build` rewrites them to relative paths in `dist/`). Imports inside a feature stay relative.
