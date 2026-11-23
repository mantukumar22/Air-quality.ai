/**
 * @fileoverview Flat ESLint configuration combining Next.js Core Web Vitals,
 * strict TypeScript rules, strict JSX accessibility, import ordering, and console hygiene.
 */

import { defineConfig, globalIgnores } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';

const strictTsRules = Object.assign(
  {},
  ...tseslint.configs.strict.map((config) => config.rules ?? {})
);

export default defineConfig([
  globalIgnores(['.next/**', 'node_modules/**', 'coverage/**', 'out/**', 'next-env.d.ts']),
  ...nextCoreWebVitals,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      ...strictTsRules,
      ...jsxA11y.flatConfigs.strict.rules,
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'import/order': [
        'error',
        {
          groups: ['external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [
            { pattern: '@/**', group: 'internal', position: 'after' },
            { pattern: './*.css', group: 'index', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'never',
        },
      ],
    },
  },
]);
