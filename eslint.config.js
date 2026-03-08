import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import customRules from './eslint-rules/index.js';

export default [
  {
    ignores: ['dev-notes/**', 'coverage/**', 'node_modules/**', '.tmp/**', 'eslint-rules/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
      custom: customRules,
    },
    rules: {
      'no-console': 'off',
      'import/no-unresolved': 'off',
      'import/extensions': ['error', 'ignorePackages', { js: 'always' }],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  // English-only enforcement for source code
  {
    files: ['src/**/*.js', 'tests/**/*.js'],
    plugins: {
      custom: customRules,
    },
    rules: {
      'custom/english-only': ['warn', { checkComments: true, checkAllStrings: false }],
    },
  },
  {
    files: ['src/services/**/*.js'],
    rules: {
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['tests/**/*.test.js'],
    rules: {
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
      },
    },
  },
];
