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
yarn start:dev                       # watch mode on http://localhost:3000
curl -i http://localhost:3000/health # → 200 {"status":"ok"}
```

Environment variables are listed in [`.env.example`](.env.example). The app reads them from the process environment (no `.env` loading yet), e.g. `PORT=4000 yarn start:dev`.

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

`main` requires the `node-ci` check to pass before a PR can be merged, and the rule applies to admins too (no bypass). GitHub only offers a check as required after it has run once, so a repository admin sets it once, after the first workflow run:

```bash
gh api -X PUT repos/spreadcode-dev/numo-api/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["node-ci"] },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null
}
JSON
```

Check it with `gh api repos/spreadcode-dev/numo-api/branches/main/protection/required_status_checks`.

### PR checks

The same workflow also checks the conventions from [`CLAUDE.md`](CLAUDE.md) on every pull request. The rules live in small Bash scripts in [`.github/scripts/`](.github/scripts/), each tested by a Vitest spec next to it.

| Job               | Rule                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validate-branch` | The source branch is `main`, `develop`, `release/<version>` (e.g. `release/1.2.3`) or `<type>/<issue-number>-<slug>`, lowercase and hyphenated.                                 |
| `validate-commit` | The PR has **exactly one commit**, and every non-merge commit is titled `#<issue-number>: <description>`. `release/*` → `main` and `main` → `develop` may have several commits. |

Allowed `<type>` prefixes: `feature`, `bugfix`, `hotfix`, `chore`, and `ai`, `copilot`, `cursor`, `claude`, `codex` for branches created by AI tools.

To squash a PR into one commit:

```bash
git fetch origin
git reset --soft $(git merge-base origin/<base-branch> HEAD)
git commit -m "#<issue-number>: <description>"
git push --force-with-lease
```

Run a check locally, e.g. `HEAD_REF=my-branch bash .github/scripts/validate-branch.sh`. Making `validate-branch` and `validate-commit` required checks is part of the GitFlow branch protection setup.

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
