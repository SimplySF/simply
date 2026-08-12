/*
 * Copyright (c) 2024, Clay Chipps; Copyright (c) 2024, Salesforce.com, Inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import headerPlugin from 'eslint-plugin-header';
import { minimatch } from 'minimatch';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

// Packages carrying the Apache-2.0 header (all published plugins except the legacy "simply" umbrella package).
const apacheHeaderPackages = [
  'packages/simply-apex',
  'packages/simply-core',
  'packages/simply-data',
  'packages/simply-package',
  'packages/simply-permissions',
  'packages/simply-project',
  'packages/simply-sobject',
];

// The legacy "simply" umbrella package still carries the original BSD-3-Clause header.
const bsdHeaderPackages = ['packages/simply'];

const allPackages = [...apacheHeaderPackages, ...bsdHeaderPackages];

// sf-plugin's recommended rules only ever applied to the oclif command packages, not simply-core or simply.
const sfPluginPackages = allPackages.filter((pkg) => pkg !== 'packages/simply-core' && pkg !== 'packages/simply');

// Every package's test suite relaxes a handful of rules; only simply-core's test override skipped the mocha env.
const mochaTestPackages = allPackages.filter((pkg) => pkg !== 'packages/simply-core');
const nonMochaTestPackages = ['packages/simply-core'];

const apacheHeaderRule = [
  2,
  'block',
  [
    '',
    {
      pattern: ' \\* Copyright \\(c\\) \\d{4}, Clay Chipps; Copyright \\(c\\) \\d{4} Salesforce, Inc.',
      template: ' * Copyright (c) 2026, Clay Chipps; Copyright (c) 2026 Salesforce, Inc.',
    },
    ' *',
    ' * Licensed under the Apache License, Version 2.0 (the "License");',
    ' * you may not use this file except in compliance with the License.',
    ' * You may obtain a copy of the License at',
    ' *',
    ' *     http://www.apache.org/licenses/LICENSE-2.0',
    ' *',
    ' * Unless required by applicable law or agreed to in writing, software',
    ' * distributed under the License is distributed on an "AS IS" BASIS,',
    ' * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.',
    ' * See the License for the specific language governing permissions and',
    ' * limitations under the License.',
    ' ',
  ],
];

const bsdHeaderRule = [
  2,
  'block',
  [
    '',
    {
      pattern: ' \\* Copyright \\(c\\) \\d{4}, Clay Chipps; Copyright \\(c\\) \\d{4}, Salesforce.com, Inc.',
      template: ' * Copyright (c) 2024, Clay Chipps; Copyright (c) 2024, Salesforce.com, Inc.',
    },
    ' * All rights reserved.',
    ' * Licensed under the BSD 3-Clause license.',
    ' * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause',
    ' ',
  ],
];

const testOverrideRules = {
  // Allow assert style expressions. i.e. expect(true).to.be.true
  'no-unused-expressions': 'off',
  // It is common for tests to stub out method.
  '@typescript-eslint/ban-ts-comment': 'off',
  // Return types are defined by the source code. Allows for quick overwrites.
  '@typescript-eslint/explicit-function-return-type': 'off',
  // Mocked out the methods that shouldn't do anything in the tests.
  '@typescript-eslint/no-empty-function': 'off',
  // Easily return a promise in a mocked method.
  '@typescript-eslint/require-await': 'off',
};

const toSrcFiles = (pkgs) => pkgs.map((pkg) => `${pkg}/**/*.ts`);
const toTestFiles = (pkgs) => pkgs.map((pkg) => `${pkg}/test/**/*.ts`);

// Some rules in eslint-config-salesforce-typescript come from nested `overrides` blocks (e.g. stricter
// rules scoped to `src/**` only). FlatCompat translates those into a `files: [predicateFn]` entry using
// absolute paths. Naively overwriting `files` with our package-scoped globs would drop that src-only
// scoping and let those rules leak into test files, so compose (package scope AND original predicate)
// instead of replacing when a config already carries its own file matcher.
const scoped = (pkgs, eslintrcConfig, defaultFiles = toSrcFiles(pkgs)) =>
  compat.config(eslintrcConfig).map((config) => {
    if (!config.files) {
      return { ...config, files: defaultFiles };
    }

    const originalMatchers = config.files;
    const matchesOriginal = (absoluteFilePath) =>
      originalMatchers.some((matcher) =>
        typeof matcher === 'function' ? matcher(absoluteFilePath) : minimatch(absoluteFilePath, matcher),
      );
    const pkgDirs = pkgs.map((pkg) => path.join(__dirname, pkg) + path.sep);

    return {
      ...config,
      files: [(absoluteFilePath) => pkgDirs.some((dir) => absoluteFilePath.startsWith(dir)) && matchesOriginal(absoluteFilePath)],
    };
  });

export default [
  {
    ignores: ['dist/**', 'build/**', 'coverage/**', 'node_modules/**', '**/*.config.js', '**/*.config.cjs', '**/*.config.mjs'],
  },
  ...scoped(allPackages, { extends: ['eslint-config-salesforce-typescript'] }),
  {
    // eslint-config-salesforce-typescript's parserOptions.project globs assume a tsconfig.json
    // next to each package's src (pre-centralization) and a root test/tsconfig.json that never
    // existed. Now that tsconfig.json is a single repo-wide config, point the parser at the
    // projects that actually exist, resolved from this config file's directory regardless of cwd.
    files: toSrcFiles(allPackages),
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['tsconfig.json', 'packages/*/test/tsconfig.json'],
      },
    },
  },
  ...scoped(sfPluginPackages, { extends: ['plugin:sf-plugin/recommended'] }),
  {
    files: toSrcFiles(apacheHeaderPackages),
    plugins: { header: headerPlugin },
    rules: { 'header/header': apacheHeaderRule },
  },
  {
    files: toSrcFiles(bsdHeaderPackages),
    plugins: { header: headerPlugin },
    rules: { 'header/header': bsdHeaderRule },
  },
  ...scoped(mochaTestPackages, { env: { mocha: true }, rules: testOverrideRules }, toTestFiles(mochaTestPackages)),
  ...scoped(nonMochaTestPackages, { rules: testOverrideRules }, toTestFiles(nonMochaTestPackages)),
];
