# numo-api

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
yarn start:dev                       # watch mode on http://localhost:3000
curl -i http://localhost:3000/health # → 200 {"status":"ok"}
```

Environment variables are listed in [`.env.example`](.env.example). The app reads them from the process environment (no `.env` loading yet), e.g. `PORT=4000 yarn start:dev`.

## Quality checks

| Command          | What it does                                      |
| ---------------- | ------------------------------------------------- |
| `yarn test`      | Unit tests (Vitest, `*.spec.ts` next to the code) |
| `yarn test:cov`  | Unit tests with a coverage report in `coverage/`  |
| `yarn lint`      | Oxlint; fails on any error or warning             |
| `yarn typecheck` | `tsc --noEmit` across the project                 |
| `yarn format`    | Prettier on the whole repo                        |
| `yarn build`     | Compiles to `dist/`                               |

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
```

Dependencies point inward: presentation/infrastructure → application → domain. A feature only creates the layers it needs (`health` has only `presentation/`).
