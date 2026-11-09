# numo-api: conventions

NestJS 12 (TypeScript, **ESM**) REST API for NuMo. Local-only for now. Setup and commands: see `README.md`.

## Workflow

- Everything is in **English**: code, comments, issues, commits, PRs.
- Branches: Conventional Branch, `<type>/<issue-number>-<slug>` (e.g. `feature/12-create-account`, `bugfix/…`).
- Commits: `#<issue-number>: <description>`.
- This repo is public: don't reference other private projects in code, commits or PRs.

## Tooling

- **Yarn 4 only** (Corepack, `packageManager`); never npm, never commit `package-lock.json`.
- Node 26 (`.nvmrc`). Corepack must be installed separately (`npm install -g corepack`).
- Before handing work over: `yarn format:check && yarn lint && yarn typecheck && yarn test:cov && yarn build` must pass (same gate as CI; 80% coverage).
- Never bypass the pre-commit hook (`--no-verify`).

## ESM

- Relative imports end in `.js` (`import { X } from './x.js'`), even from `.ts` files.
- No `__dirname`; use `import.meta.dirname`.
- Tests run on **Vitest** (globals on): mocks are `vi.fn()`, not `jest.fn()`.

## Architecture (Clean Architecture, by feature)

- Layout: `src/modules/<feature>/{domain,application,infrastructure,presentation}` + `<feature>.module.ts`; `src/shared/` stays small.
- Dependency rule: presentation/infrastructure → application → domain. Domain and application import nothing from Nest, the ORM or HTTP libs.
- Use cases depend on **ports** (interfaces owned by domain/application), injected by token; infrastructure implements them.
- Controllers are thin: validate input → call one use case → map the result. Domain errors are mapped to HTTP status codes in presentation.
- Create only the layers a feature actually needs; no empty layers or abstractions "for later".

## Clean Code

- Intention-revealing names; small single-purpose functions (~20 lines), ≤ 3 args, no boolean flag args.
- Don't return or pass `null`; use `T | undefined`, empty collections or domain errors.
- Comments only for a non-obvious _why_; no commented-out code.
- Let Prettier/Oxlint decide style.

## Tests

- Unit tests next to the code (`*.spec.ts`), Arrange–Act–Assert, one behaviour per test.
- Domain and use cases: tested with in-memory fakes; no DB, no Nest testing module.
- Every new function gets a test; every bug fix gets a regression test.
