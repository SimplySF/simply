# Contributing

Thanks for your interest in contributing to Simply! This document covers the repo structure, how to get set up, and how to submit changes.

1. Please read our [Code of Conduct](CODE_OF_CONDUCT.md).
2. Create a new issue before starting significant work so we can keep track of what you're trying to add or fix, offer suggestions, and avoid duplicate effort.
3. Fork this repository.
4. [Set up your environment](#setup) and make sure you can build and test the affected package(s) locally.
5. Create a topic branch in your fork.
6. Make your change, following the [commit message format](#commit-messages) below.
7. Write tests for your change. No pull request will be accepted without tests covering the change.
8. Open a pull request against `main`. We'll review your code, suggest any needed changes, and merge it in.

## Repository Structure

This repository is a Lerna monorepo containing eight Salesforce CLI plugins, plus one internal shared library:

| Package                                                       | Description                                      | Path                          |
| ------------------------------------------------------------- | ------------------------------------------------ | ----------------------------- |
| [`@simplysf/simply`](packages/simply)                         | Orchestrator plugin — bundles every plugin below | `packages/simply`             |
| [`@simplysf/simply-apex`](packages/simply-apex)               | Apex commands                                    | `packages/simply-apex`        |
| [`@simplysf/simply-data`](packages/simply-data)               | File upload/download commands                    | `packages/simply-data`        |
| [`@simplysf/simply-document`](packages/simply-document)       | Documentation generation commands                | `packages/simply-document`    |
| [`@simplysf/simply-package`](packages/simply-package)         | Package dependency management commands           | `packages/simply-package`     |
| [`@simplysf/simply-permissions`](packages/simply-permissions) | Permissions commands                             | `packages/simply-permissions` |
| [`@simplysf/simply-project`](packages/simply-project)         | Salesforce project commands                      | `packages/simply-project`     |
| [`@simplysf/simply-schema`](packages/simply-schema)           | Schema visualization commands                    | `packages/simply-schema`      |
| [`@simplysf/simply-sobject`](packages/simply-sobject)         | SObject commands                                 | `packages/simply-sobject`     |
| [`@simplysf/simply-core`](packages/simply-core)               | Shared internal library — not a CLI plugin       | `packages/simply-core`        |

Tooling:

- **Package manager:** pnpm workspaces
- **Task orchestration:** Lerna v10 (independent versioning) + Wireit (per-package build caching)
- **Language:** TypeScript (ESM)
- **Node:** ^22.13.0 || ^24.0.0 || ^26.0.0 (required by Lerna 10; the published CLI plugins themselves only require >=22.0.0)

## Setup

This repo pins its pnpm version via the `packageManager` field in `package.json`. Use [Corepack](https://nodejs.org/api/corepack.html) (bundled with Node.js) to install that exact version rather than installing pnpm globally:

```sh
corepack enable
git clone git@github.com:SimplySF/simply.git
cd simply
corepack install   # installs the pnpm version pinned in package.json
pnpm install
pnpm run build
pnpm test
```

`corepack enable` only needs to be run once per machine. After that, Corepack transparently uses whatever version of pnpm is pinned in `package.json`, so every contributor and CI job runs the same version.

`pnpm install` at the root installs and links every workspace package and sets up git hooks automatically via husky.

To try your changes with the Salesforce CLI, run a plugin's local dev binary from inside its package directory:

```sh
cd packages/simply-data
./bin/dev.cmd simply data file upload --file-path fileToUpload.txt --target-org myTargetOrg
```

or link the package so you can run it from anywhere:

```sh
sf plugins link .
sf plugins
```

## Common Commands

Run from the repo root to target all packages:

```sh
pnpm run build       # lerna run build (compile + lint)
pnpm run compile     # lerna run compile
pnpm run lint        # lerna run lint
pnpm run test        # lerna run test
pnpm run test:only   # lerna run test:only
pnpm run format      # lerna run format
pnpm run reset       # clear node_modules, the lockfile, and all wireit/TS/ESLint caches
pnpm run reset:install  # same as reset, then reinstall dependencies
```

Run inside a single package directory to target just that package:

```sh
cd packages/simply-data
pnpm run build
pnpm test
```

## Adding a Dependency

To add a dependency to a specific package:

```sh
pnpm add <package> --filter @simplysf/simply-data
```

To add a root-level devDependency (e.g., a shared build tool):

```sh
pnpm add -w -D <package>
```

## Commit Messages

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/) (enforced by commitlint on commit). This matters beyond style: Lerna uses your commit types during release to decide which packages get versioned and how their `CHANGELOG.md` is generated.

```text
feat: add support for X
fix: correct handling of Y
docs: update README
chore: bump a dependency
```

If your change only affects one package, scope the commit to it, e.g. `feat(simply-data): add --max-parallel-jobs flag`.

## Pull Requests

- Keep pull requests focused on a single change where possible.
- Make sure `pnpm run build` and `pnpm test` pass before opening the PR — the same checks run in CI and as a pre-push hook.
- Aim for high test coverage on new code.
- Update the relevant package's README/command docs if you changed a command's flags or behavior. `packages/simply-data` regenerates its README command docs automatically on version bump (`oclif readme` runs from its `version` script); every other plugin package requires running `pnpm run readme` manually in that package and committing the result.
- `command-snapshot.json` (used to flag accidental breaking changes to commands/flags) regenerates automatically as part of each package's `pnpm run build` — just commit whatever changes. CI re-verifies with `git diff --exit-code` after `pnpm run build`, so a stale, uncommitted snapshot fails the build.
- If you change a package's flags and that package is bundled into `@simplysf/simply` (see the orchestrator's `oclif.plugins` list), also rebuild `packages/simply`'s own `command-snapshot.json`. Its wireit cache only watches `packages/simply/src/**/*.ts`, so `pnpm run build` there won't notice a dependency's flags changed and will report cached success without regenerating anything. Force it by running its snapshot generator directly:

  ```sh
  cd packages/simply
  node --loader ts-node/esm --no-warnings=ExperimentalWarning ./bin/dev.js snapshot:generate
  npx prettier --write command-snapshot.json
  ```

## Versioning and Publishing

Versioning uses Lerna's independent mode — each package has its own version and can release separately.

The `release` workflow runs on pushes to `main` and, in a single step, bumps versions, updates each package's `CHANGELOG.md`, creates git tags in the format `@simplysf/simply@<version>`, pushes them, creates a GitHub release per changed package, and publishes each bumped package to npm:

```sh
lerna publish --conventional-commits --create-release github --yes
```

### Prerelease

Push to a `prerelease/**` branch (e.g., `prerelease/my-feature`) to trigger a prerelease, versioned and published the same way:

```sh
lerna publish --conventional-commits --conventional-prerelease --preid dev --create-release github --yes
```

### Recovering a Failed Publish

If a version was tagged and released but npm publish failed for one or more packages (e.g. a registry outage), trigger the `release` workflow manually (`workflow_dispatch`) with the `prerelease` input left blank. This runs `lerna publish from-package --yes`, which compares each package's committed version against what's actually on npm and publishes anything missing, without bumping versions again.

## CI

| Workflow      | Trigger                                               | What it does                                                                                                                                                                            |
| ------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test.yml`    | Push to non-main branches                             | Runs `pnpm run build` + `pnpm test` on Linux (lts/_, lts/-1) and Windows (lts/_)                                                                                                        |
| `release.yml` | Push to `main` or `prerelease/**`, or manual dispatch | Runs `pnpm run build` + `pnpm test`, then bumps versions, tags, creates GitHub releases, and publishes to npm in one step (see [Versioning and Publishing](#versioning-and-publishing)) |

## Git Hooks

| Hook         | Command                                                 |
| ------------ | ------------------------------------------------------- |
| `pre-commit` | `lint-staged` — runs `prettier --write` on staged files |
| `commit-msg` | `commitlint` — enforces conventional commit format      |
| `pre-push`   | `pnpm run build && pnpm test`                           |

Hooks are installed automatically on `pnpm install` via the `prepare: husky` script.

## Reporting Issues

Please report bugs or request features by [opening an issue](https://github.com/SimplySF/simply/issues) rather than submitting a PR without prior discussion for anything non-trivial.
