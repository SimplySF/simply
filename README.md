# Simply

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Simply is a collection of [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) plugins built by [SimplySF](https://github.com/SimplySF) that add commands for working with Apex, CI/CD pipelines, data, documentation generation, packages, permissions, projects, schema visualization, and SObjects in Salesforce orgs.

📖 **[Documentation site](https://simplysf.github.io/simply/)** — guides and command reference for every plugin, with [`simply-cicd`](https://simplysf.github.io/simply/cicd/) covered in the most depth.

## Packages

This repository is a monorepo. Ten packages are published independently to npm as CLI plugins, plus one internal shared library used by the others:

| Package                                                       | Description                                                           |
| ------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`@simplysf/simply`](packages/simply)                         | Orchestrator plugin — bundles every plugin below                      |
| [`@simplysf/simply-apex`](packages/simply-apex)               | Commands for working with Apex                                        |
| [`@simplysf/simply-cicd`](packages/simply-cicd)               | Commands for Salesforce CI/CD pipelines                               |
| [`@simplysf/simply-data`](packages/simply-data)               | Commands for uploading and downloading files in a Salesforce org      |
| [`@simplysf/simply-document`](packages/simply-document)       | Commands for generating project documentation                         |
| [`@simplysf/simply-package`](packages/simply-package)         | Commands for managing package dependencies                            |
| [`@simplysf/simply-permissions`](packages/simply-permissions) | Commands for working with permissions                                 |
| [`@simplysf/simply-project`](packages/simply-project)         | Commands for working with Salesforce projects                         |
| [`@simplysf/simply-schema`](packages/simply-schema)           | Commands for visualizing Salesforce schema                            |
| [`@simplysf/simply-sobject`](packages/simply-sobject)         | Commands for working with SObjects                                    |
| [`@simplysf/simply-core`](packages/simply-core)               | Shared internal library used by the other packages — not a CLI plugin |

See each package's README for its full command reference.

## Installation

Install the orchestrator plugin to get every command in one shot, or install an individual plugin for just the commands you need:

```sh
sf plugins install @simplysf/simply
```

```sh
sf plugins install @simplysf/simply-apex
sf plugins install @simplysf/simply-cicd
sf plugins install @simplysf/simply-data
sf plugins install @simplysf/simply-document
sf plugins install @simplysf/simply-package
sf plugins install @simplysf/simply-permissions
sf plugins install @simplysf/simply-project
sf plugins install @simplysf/simply-schema
sf plugins install @simplysf/simply-sobject
```

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the repo structure, how to set up and build the project, our commit conventions, and how to submit a pull request. Please also read our [Code of Conduct](CODE_OF_CONDUCT.md).

## Issues

Please report bugs or request features by [opening an issue](https://github.com/SimplySF/simply-node/issues) in this repository.

## License

Licensed under the [Apache-2.0](LICENSE.txt) license.
