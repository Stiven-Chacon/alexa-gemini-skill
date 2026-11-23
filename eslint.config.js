const js = require('@eslint/js');
const globals = require('globals');
const jestPlugin = require('eslint-plugin-jest');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**', 'lambda/coverage/**', 'lambda/node_modules/**', '.ask/**', 'dist/**'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ...jestPlugin.configs['flat/recommended'],
    files: ['lambda/tests/**/*.js'],
  },
  eslintConfigPrettier,
];
