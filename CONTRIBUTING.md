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

This repository is a Lerna monorepo containing three Salesforce CLI plugins:

| Package                                               | Description                                                  | Path                      |
| ----------------------------------------------------- | ------------------------------------------------------------ | ------------------------- |
| [`@simplysf/simply`](packages/simply)                 | Orchestrator plugin — bundles simply-data and simply-package | `packages/simply`         |
| [`@simplysf/simply-data`](packages/simply-data)       | File upload/download commands                                | `packages/simply-data`    |
| [`@simplysf/simply-package`](packages/simply-package) | Package dependency management commands                       | `packages/simply-package` |

Tooling:

- **Package manager:** npm workspaces
- **Task orchestration:** Lerna v8 (independent versioning) + Wireit (per-package build caching)
- **Language:** TypeScript (ESM)
- **Node:** >=22.0.0

## Setup

```sh
git clone git@github.com:SimplySF/simply.git
cd simply
npm install
npm run build
npm test
```

`npm install` at the root installs and links all three packages and sets up git hooks automatically via husky.

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
- Make sure `npm run build` and `npm test` pass before opening the PR — the same checks run in CI and as a pre-push hook.
- Aim for high test coverage on new code.
- Update the relevant package's README/command docs if you changed a command's flags or behavior. `packages/simply-data` regenerates its README command docs automatically on version bump (`oclif readme` runs from its `version` script); `simply` and `simply-package` require running `npm run readme` manually in that package and committing the result.

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

### First Release After Migration

The existing git tags use the old single-package format (e.g., `2.2.0`). Before the first Lerna release, create matching tags in Lerna's expected format so conventional-commits analysis starts from the right place:

```sh
git tag @simplysf/simply@2.2.0 <commit-sha>
git tag @simplysf/simply-data@2.1.1 <commit-sha>
git tag @simplysf/simply-package@2.3.0 <commit-sha>
git push origin --tags
```

## CI

| Workflow      | Trigger                                               | What it does                                                                                                                                                                          |
| ------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test.yml`    | Push to non-main branches                             | Runs `npm run build` + `npm test` on Linux (lts/_, lts/-1) and Windows (lts/_)                                                                                                        |
| `release.yml` | Push to `main` or `prerelease/**`, or manual dispatch | Runs `npm run build` + `npm test`, then bumps versions, tags, creates GitHub releases, and publishes to npm in one step (see [Versioning and Publishing](#versioning-and-publishing)) |

## Git Hooks

| Hook         | Command                                                 |
| ------------ | ------------------------------------------------------- |
| `pre-commit` | `lint-staged` — runs `prettier --write` on staged files |
| `commit-msg` | `commitlint` — enforces conventional commit format      |
| `pre-push`   | `npm run build && npm test`                             |

Hooks are installed automatically on `npm install` via the `prepare: husky` script.

## Reporting Issues

Please report bugs or request features by [opening an issue](https://github.com/SimplySF/simply/issues) rather than submitting a PR without prior discussion for anything non-trivial.
