import tsParser from '@typescript-eslint/parser'

export default [
  {
    ignores: [
      '.next/**',
      'dist/**',
      'node_modules/**',
      'scratch/**',
      'supabase/**',
      '*.config.*',
      'next-env.d.ts',
      'tsconfig.tsbuildinfo',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },
    rules: {
      'no-debugger': 'error',
      'no-unused-vars': 'off',
    },
  },
]
