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
import { finished } from 'node:stream/promises';
import { stringify } from 'csv-stringify';

export type CsvFileWriter = {
  /**
   * Write one record to the CSV file. Resolves once it's safe to write the next record —
   * immediately if the underlying stream's internal buffer has room, or after its `'drain'`
   * event if not. Safe to call from multiple concurrently-running async tasks: writes are
   * ordered by call order, not completion order, since `stream.write()` itself is synchronous.
   */
  write(record: Record<string, unknown>): Promise<void>;
  /** Finish writing and wait for the file to be fully flushed to disk. */
  end(): Promise<void>;
};

/**
 * Open a CSV file for streaming, record-at-a-time writes.
 *
 * Backed by a real `csv-stringify` -> `fs.createWriteStream()` pipeline instead of buffering
 * records in memory or re-opening the file per write, so writing many records keeps memory flat.
 * `write()` respects the underlying stream's backpressure, so callers get naturally throttled
 * instead of building an unbounded queue of pending writes.
 */
export function createCsvFileWriter(outputPath: string, columns: string[]): CsvFileWriter {
  const stringifier = stringify({ header: true, columns });
  const fileStream = fs.createWriteStream(outputPath);

  const donePromise = finished(fileStream);
  // finished() attaches its listeners immediately, so without this the promise could be reported
  // as an unhandled rejection if a write error occurs before end() ever awaits it.
  donePromise.catch(() => {});

  stringifier.pipe(fileStream);

  return {
    write: (record) =>
      new Promise((resolve, reject) => {
        const canWriteMore = stringifier.write(record, (err) => {
          if (err) {
            reject(err);
          }
        });

        if (canWriteMore) {
          resolve();
        } else {
          stringifier.once('drain', resolve);
        }
      }),
    end: async (): Promise<void> => {
      stringifier.end();
      await donePromise;
    },
  };
}
