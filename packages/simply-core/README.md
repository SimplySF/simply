# @simplysf/simply-core

[![NPM](https://img.shields.io/npm/v/@simplysf/simply-core?label=@simplysf/simply-core)](https://npmjs.com/@simplysf/simply-core) [![Downloads/week](https://img.shields.io/npm/dw/@simplysf/simply-core.svg)](https://npmjs.com/@simplysf/simply-core) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://raw.githubusercontent.com/SimplySF/simply-node/main/LICENSE.txt)

Shared internal utilities for [`@simplysf`](https://github.com/SimplySF/simply-node) Salesforce CLI plugins. This is not a Salesforce CLI plugin itself — it's a plain library consumed by the other packages in this monorepo.

## Install

```bash
npm install @simplysf/simply-core
```

## Bulk API v2 streaming export

`streamBulkQueryToFile()` runs a SOQL query through Bulk API v2 and streams the CSV results directly to a file, one result page at a time, without buffering the result set in memory.

`Connection.bulk2.query()` (jsforce's own convenience method) routes each result page through jsforce's legacy HTTP transport, which fully buffers each page into memory before your code can consume it — this defeats streaming for large exports. `streamBulkQueryToFile()` avoids that by fetching result pages directly with `undici`, converting the response body straight to a Node stream, and piping it to disk with `stream.pipeline()`. jsforce is still used for job creation and polling; only the result-page fetch bypasses it.

```ts
import { Connection } from '@salesforce/core';
import { streamBulkQueryToFile } from '@simplysf/simply-core';

const result = await streamBulkQueryToFile(connection, 'SELECT Id, Name FROM Account', './accounts.csv');
// { jobId: '750...', numberRecordsProcessed: 42 }
```

## Issues

Please report any issues at https://github.com/SimplySF/simply-node/issues

## Contributing

This package is part of the [`@simplysf/simply`](https://github.com/SimplySF/simply-node) monorepo. See the repo's [CONTRIBUTING.md](https://github.com/SimplySF/simply-node/blob/main/CONTRIBUTING.md) for the repo structure, how to set up and build the project, our commit conventions, and how to submit a pull request. Please also read our [Code of Conduct](https://github.com/SimplySF/simply-node/blob/main/CODE_OF_CONDUCT.md).
