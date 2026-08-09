# SimplySF Monorepo

This repository is a Lerna monorepo containing three Salesforce CLI plugins.

## Packages

| Package                                               | Description                                                  | Path                      |
| ----------------------------------------------------- | ------------------------------------------------------------ | ------------------------- |
| [`@simplysf/simply`](packages/simply)                 | Orchestrator plugin — bundles simply-data and simply-package | `packages/simply`         |
| [`@simplysf/simply-data`](packages/simply-data)       | File upload/download commands                                | `packages/simply-data`    |
| [`@simplysf/simply-package`](packages/simply-package) | Package dependency management commands                       | `packages/simply-package` |

## Tooling

- **Package manager:** npm workspaces
- **Task orchestration:** Lerna v8 (independent versioning) + Wireit (per-package build caching)
- **Language:** TypeScript (ESM)
- **Node:** >=22.0.0

## Common Commands

Run from the repo root to target all packages:

```sh
npm run build       # lerna run build (compile + lint)
npm run compile     # lerna run compile
npm run lint        # lerna run lint
npm run test        # lerna run test
npm run test:only   # lerna run test:only
npm run format      # lerna run format
npm run clean       # lerna run clean
```

Run inside a single package directory to target just that package:

```sh
cd packages/simply-data
npm run build
npm test
```

## Adding a Dependency

To add a dependency to a specific package:

```sh
npm install <package> --workspace=packages/simply-data
```

To add a root-level devDependency (e.g., a shared build tool):

```sh
npm install <package> --save-dev
```

## Versioning and Publishing

Versioning uses Lerna's independent mode — each package has its own version and can release separately.

The `create-github-release` workflow runs on pushes to `main` and calls:

```sh
lerna version --conventional-commits --create-release github --yes
```

This analyzes conventional commits per package, bumps versions, creates git tags in the format `@simplysf/simply@<version>`, updates each package's `CHANGELOG.md`, and creates a GitHub release per changed package.

Publishing runs automatically when a GitHub release is published (`onRelease.yml`) via:

```sh
lerna publish from-git --yes
```

This publishes every package whose version tag points at the current commit.

### Prerelease

Push to a `prerelease/**` branch (e.g., `prerelease/my-feature`) to trigger a prerelease:

```sh
lerna version --conventional-commits --conventional-prerelease --preid dev --create-release github --yes
```

### First Release After Migration

The existing git tags use the old single-package format (e.g., `2.2.0`). Before the first Lerna release, create matching tags in Lerna's expected format so conventional-commits analysis starts from the right place:

```sh
git tag @simplysf/simply@2.2.0 <commit-sha>
git tag @simplysf/simply-data@2.1.1 <commit-sha>
git tag @simplysf/simply-package@2.3.0 <commit-sha>
git push origin --tags
```

## CI

| Workflow                    | Trigger                           | What it does                                                                   |
| --------------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| `test.yml`                  | Push to non-main branches         | Runs `npm run build` + `npm test` on Linux (lts/_, lts/-1) and Windows (lts/_) |
| `create-github-release.yml` | Push to `main` or `prerelease/**` | Runs `lerna version` to bump versions and create GitHub releases               |
| `onRelease.yml`             | GitHub release published          | Runs `lerna publish from-git` to publish changed packages to npm               |
| `devScripts.yml`            | Weekly / manual                   | Updates `@simplysf/dev-scripts` across packages                                |

## Git Hooks

| Hook         | Command                                                 |
| ------------ | ------------------------------------------------------- |
| `pre-commit` | `lint-staged` — runs `prettier --write` on staged files |
| `commit-msg` | `commitlint` — enforces conventional commit format      |
| `pre-push`   | `npm run build && npm test`                             |

Hooks are installed automatically on `npm install` via the `prepare: husky` script.
