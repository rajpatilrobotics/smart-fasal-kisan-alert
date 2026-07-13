import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { importX } from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const sourceFiles = ['**/*.{js,mjs,cjs,ts,tsx,mts,cts}'];
const typeScriptFiles = ['**/*.{ts,tsx,mts,cts}'];
const typeCheckedConfigs = [
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
].map((config) => ({ ...config, files: typeScriptFiles }));

function restrictImports(files, group, message) {
  return {
    files,
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group, message }] }],
    },
  };
}

export default tseslint.config(
  {
    ignores: [
      '**/.next/**',
      '**/.turbo/**',
      '**/build/**',
      '**/coverage/**',
      '**/dist/**',
      '**/generated/**',
      '**/node_modules/**',
      '**/playwright-report/**',
      '**/public/**',
      '**/test-results/**',
    ],
  },
  eslint.configs.recommended,
  ...typeCheckedConfigs,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'import-x': importX,
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: ['apps/*/tsconfig.json', 'packages/*/tsconfig.json'],
        }),
      ],
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports', prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      'import-x/no-cycle': ['error', { ignoreExternal: true }],
      'import-x/no-duplicates': 'error',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'module',
    },
  },
  restrictImports(
    ['apps/**/*.{ts,tsx,mts,cts}'],
    [
      '../../apps/*',
      '../../../apps/*',
      '@smart-fasal/farmer-web',
      '@smart-fasal/rsk-web',
      '@smart-fasal/mp-web',
    ],
    'Applications must share packages and must never import another application.',
  ),
  restrictImports(
    ['packages/domain/**/*.{ts,tsx,mts,cts}'],
    [
      'react',
      'react/*',
      'next',
      'next/*',
      'fastify',
      'drizzle-orm',
      'drizzle-orm/*',
      '@google-cloud/*',
      '@google/generative-ai',
      '@google/generative-ai/*',
    ],
    'The domain package is pure and cannot import UI, transport, persistence or provider SDKs.',
  ),
  restrictImports(
    ['packages/ui/**/*.{ts,tsx,mts,cts}'],
    [
      '@smart-fasal/application',
      '@smart-fasal/authz',
      '@smart-fasal/persistence',
      'fastify',
      'drizzle-orm',
      'drizzle-orm/*',
      '@google-cloud/*',
    ],
    'Shared UI owns presentation only and cannot import authorization, persistence or provider code.',
  ),
  {
    files: sourceFiles,
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  prettier,
);
