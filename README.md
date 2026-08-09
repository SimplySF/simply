# Simply

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Simply is a collection of [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) plugins built by [SimplySF](https://github.com/SimplySF) that add commands for working with files and second-generation packages in Salesforce orgs.

## Packages

This repository is a monorepo containing three plugins, each published independently to npm:

| Package                                               | Description                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| [`@simplysf/simply`](packages/simply)                 | Orchestrator plugin — bundles simply-data and simply-package     |
| [`@simplysf/simply-data`](packages/simply-data)       | Commands for uploading and downloading files in a Salesforce org |
| [`@simplysf/simply-package`](packages/simply-package) | Commands for managing package dependencies                       |

See each package's README for its full command reference.

## Installation

Install the orchestrator plugin to get every command, or install an individual plugin if you only need one set of commands:

```sh
sf plugins install @simplysf/simply
```

```sh
sf plugins install @simplysf/simply-data
sf plugins install @simplysf/simply-package
```

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the repo structure, how to set up and build the project, our commit conventions, and how to submit a pull request. Please also read our [Code of Conduct](CODE_OF_CONDUCT.md).

## Issues

Please report bugs or request features by [opening an issue](https://github.com/SimplySF/simply/issues) in this repository.

## License

Licensed under the [Apache-2.0](LICENSE.txt) license.
