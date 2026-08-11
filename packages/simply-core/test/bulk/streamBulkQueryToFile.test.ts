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
import os from 'node:os';
import path from 'node:path';
import { QueryJobV2, type QueryJobInfoV2 } from '@jsforce/jsforce-node/lib/api/bulk2.js';
import type { Schema } from '@jsforce/jsforce-node';
import { Connection } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Response } from 'undici';
import { SkipFirstLineTransform, streamBulkQueryToFile } from '../../src/bulk/streamBulkQueryToFile.js';

vi.mock('undici', async () => {
  const actual = await vi.importActual<typeof import('undici')>('undici');
  return { ...actual, fetch: vi.fn() };
});

const { fetch: mockFetch } = await import('undici');

function fakeJobInfo(overrides: Partial<QueryJobInfoV2> = {}): QueryJobInfoV2 {
  return {
    id: '750xx0000000001AAA',
    numberRecordsProcessed: 2,
    ...overrides,
  } as QueryJobInfoV2;
}

describe('SkipFirstLineTransform', () => {
  it('strips a header line delivered in a single chunk', async () => {
    const transform = new SkipFirstLineTransform();
    const chunks: Buffer[] = [];
    transform.on('data', (chunk: Buffer) => chunks.push(chunk));

    transform.end(Buffer.from('Id,Name\n001,Foo\n002,Bar\n'));
    await new Promise((resolve) => transform.on('end', resolve));

    expect(Buffer.concat(chunks).toString()).to.equal('001,Foo\n002,Bar\n');
  });

  it('strips a header line split across multiple chunks', async () => {
    const transform = new SkipFirstLineTransform();
    const chunks: Buffer[] = [];
    transform.on('data', (chunk: Buffer) => chunks.push(chunk));

    transform.write(Buffer.from('Id,Na'));
    transform.write(Buffer.from('me\n001'));
    transform.end(Buffer.from(',Foo\n'));
    await new Promise((resolve) => transform.on('end', resolve));

    expect(Buffer.concat(chunks).toString()).to.equal('001,Foo\n');
  });
});

describe('streamBulkQueryToFile', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();
  let outputPath: string;

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
  });

  afterEach(() => {
    $$.restore();
    vi.mocked(mockFetch).mockReset();
    if (outputPath && fs.existsSync(outputPath)) {
      fs.rmSync(outputPath, { force: true });
    }
  });

  it('streams a single result page directly to the output file', async () => {
    const connection = await testOrg.getConnection();
    outputPath = path.join(os.tmpdir(), `simply-core-bulk-test-${Date.now()}.csv`);

    $$.SANDBOX.stub(Connection.prototype, 'refreshAuth').resolves();
    $$.SANDBOX.stub(QueryJobV2.prototype, 'open').resolves(fakeJobInfo());
    $$.SANDBOX.stub(QueryJobV2.prototype, 'poll').callsFake(async function (this: QueryJobV2<Schema>) {
      this.emit('jobComplete', fakeJobInfo());
    });

    vi.mocked(mockFetch).mockResolvedValueOnce(
      new Response('Id,Name\n001,Foo\n002,Bar\n', { status: 200, headers: { 'sforce-locator': 'null' } }),
    );

    const result = await streamBulkQueryToFile(connection, 'SELECT Id, Name FROM Account', outputPath);

    expect(result).to.deep.equal({ jobId: '750xx0000000001AAA', numberRecordsProcessed: 2 });
    expect(fs.readFileSync(outputPath, 'utf-8')).to.equal('Id,Name\n001,Foo\n002,Bar\n');
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('appends subsequent pages without repeating the header row', async () => {
    const connection = await testOrg.getConnection();
    outputPath = path.join(os.tmpdir(), `simply-core-bulk-test-${Date.now()}.csv`);

    $$.SANDBOX.stub(Connection.prototype, 'refreshAuth').resolves();
    $$.SANDBOX.stub(QueryJobV2.prototype, 'open').resolves(fakeJobInfo());
    $$.SANDBOX.stub(QueryJobV2.prototype, 'poll').callsFake(async function (this: QueryJobV2<Schema>) {
      this.emit('jobComplete', fakeJobInfo({ numberRecordsProcessed: 4 }));
    });

    vi.mocked(mockFetch)
      .mockResolvedValueOnce(
        new Response('Id,Name\n001,Foo\n002,Bar\n', { status: 200, headers: { 'sforce-locator': 'page-2' } }),
      )
      .mockResolvedValueOnce(
        new Response('Id,Name\n003,Baz\n004,Qux\n', { status: 200, headers: { 'sforce-locator': 'null' } }),
      );

    const result = await streamBulkQueryToFile(connection, 'SELECT Id, Name FROM Account', outputPath);

    expect(result.numberRecordsProcessed).to.equal(4);
    expect(fs.readFileSync(outputPath, 'utf-8')).to.equal('Id,Name\n001,Foo\n002,Bar\n003,Baz\n004,Qux\n');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws when the query job never reports completion', async () => {
    const connection = await testOrg.getConnection();

    $$.SANDBOX.stub(QueryJobV2.prototype, 'open').resolves(fakeJobInfo());
    $$.SANDBOX.stub(QueryJobV2.prototype, 'poll').resolves();

    await expect(streamBulkQueryToFile(connection, 'SELECT Id FROM Account', 'unused.csv')).rejects.toThrow(
      'Bulk query job did not report completion after polling.',
    );
  });
});
