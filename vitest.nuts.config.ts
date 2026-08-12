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

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Each package's `test:only` wireit task runs `vitest run` with its own directory as the
  // working directory, but the `projects` glob below must always resolve relative to the repo
  // root regardless of where vitest was invoked from.
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    environment: 'node',
    include: ['test/**/*.nut.ts'],
    projects: ['packages/*'],
    setupFiles: [fileURLToPath(new URL('./vitest.setup.ts', import.meta.url))],
    // NUTs create real scratch orgs and run commands against them, so they
    // need much longer allowances than the unit test config.
    testTimeout: 1_200_000,
    hookTimeout: 1_200_000,
    maxWorkers: 5,
  },
});
