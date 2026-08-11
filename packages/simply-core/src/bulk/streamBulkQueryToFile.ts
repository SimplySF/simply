/*
 * Copyright (c) 2026, Clay Chipps; Copyright (c) 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'node:fs';
import { Readable, Transform, type TransformCallback } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { QueryJobV2, type QueryJobInfoV2 } from '@jsforce/jsforce-node/lib/api/bulk2.js';
import { Connection, SfError } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import { fetch } from 'undici';

export type StreamBulkQueryToFileOptions = {
  /** Query all records, including archived/deleted ones. Defaults to `false`. */
  scanAll?: boolean;
  /** How often to poll the query job for completion, in milliseconds. Defaults to 5 seconds. */
  pollInterval?: number;
  /** How long to wait for the query job to complete before giving up, in milliseconds. Defaults to 30 minutes. */
  pollTimeout?: number;
};

export type StreamBulkQueryToFileResult = {
  jobId: string;
  numberRecordsProcessed: number;
};

/**
 * Transform stream that strips the first line (the CSV header row) from a chunked stream of
 * Buffers, without ever converting the buffered data to a string.
 *
 * Bulk API v2 query results are paginated; every page after the first repeats the header row,
 * so this is used to de-duplicate headers when appending subsequent pages to the same file.
 */
export class SkipFirstLineTransform extends Transform {
  private firstLineSkipped = false;
  private buffer: Buffer = Buffer.alloc(0);

  public _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    if (this.firstLineSkipped) {
      callback(null, chunk);
      return;
    }

    this.buffer = Buffer.concat([this.buffer, chunk]);

    const newlineIndex = this.buffer.indexOf(0x0a);

    if (newlineIndex === -1) {
      callback();
      return;
    }

    const remainingData = this.buffer.subarray(newlineIndex + 1);
    this.firstLineSkipped = true;
    this.buffer = Buffer.alloc(0);

    callback(null, remainingData);
  }

  public _flush(callback: TransformCallback): void {
    this.buffer = Buffer.alloc(0);
    callback();
  }
}

/**
 * Fetch one page of Bulk API v2 query results as a raw, unbuffered stream.
 *
 * This bypasses jsforce's own HTTP transport on purpose: jsforce's `Transport.httpRequest()`
 * resolves its request promise on the underlying `request` library's `'complete'` event, which
 * only fires once the *entire* response body has been buffered into memory. That defeats
 * streaming for large result sets. Using `undici`'s `fetch()` directly and converting the Fetch
 * API response body to a Node `Readable` avoids that buffering entirely.
 */
async function fetchResultPage(conn: Connection, path: string): Promise<{ stream: Readable; locator?: string }> {
  const url = conn.normalizeUrl(path);

  await conn.refreshAuth();

  const headers: Record<string, string> = { 'content-Type': 'text/csv' };
  if (conn.accessToken) {
    headers.Authorization = `Bearer ${conn.accessToken}`;
  }

  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    throw new SfError(
      `Failed to fetch bulk query results: HTTP ${response.status} ${response.statusText}`,
      'BulkQueryResultFetchError',
    );
  }

  if (!response.body) {
    throw new SfError('No response body was returned while fetching bulk query results.', 'BulkQueryResultFetchError');
  }

  return {
    stream: Readable.fromWeb(response.body),
    locator: response.headers.get('sforce-locator') ?? undefined,
  };
}

/**
 * Run a SOQL query through Bulk API v2 and stream the CSV results directly to a file.
 *
 * Unlike `Connection.bulk2.query()`, which routes result pages through jsforce's HTTP transport
 * (buffering each page fully into memory before it can be consumed), this streams each page's
 * HTTP response straight to disk via `stream.pipeline()`, so memory usage stays flat regardless
 * of result set size.
 */
export async function streamBulkQueryToFile(
  conn: Connection,
  soql: string,
  outputPath: string,
  options: StreamBulkQueryToFileOptions = {},
): Promise<StreamBulkQueryToFileResult> {
  const queryJob = new QueryJobV2(conn, {
    bodyParams: {
      query: soql,
      operation: options.scanAll ? 'queryAll' : 'query',
    },
    pollingOptions: {
      pollInterval: options.pollInterval ?? 5000,
      pollTimeout: options.pollTimeout ?? Duration.minutes(30).milliseconds,
    },
  });

  let jobInfo: QueryJobInfoV2 | undefined;
  queryJob.on('jobComplete', (completedJob: QueryJobInfoV2) => {
    jobInfo = completedJob;
  });

  await queryJob.open();
  await queryJob.poll();

  if (!jobInfo) {
    throw new SfError('Bulk query job did not report completion after polling.', 'BulkQueryJobIncompleteError');
  }

  const resultsPath = `/jobs/query/${jobInfo.id}/results`;

  let locator: string | undefined;
  let firstPage = true;

  while (locator !== 'null') {
    const page = await fetchResultPage(conn, locator ? `${resultsPath}?locator=${locator}` : resultsPath); // eslint-disable-line no-await-in-loop

    await pipeline(
      // eslint-disable-line no-await-in-loop
      firstPage
        ? [page.stream, fs.createWriteStream(outputPath)]
        : [page.stream, new SkipFirstLineTransform(), fs.createWriteStream(outputPath, { flags: 'a' })],
    );

    firstPage = false;
    locator = page.locator ?? 'null';
  }

  return { jobId: jobInfo.id, numberRecordsProcessed: jobInfo.numberRecordsProcessed };
}
