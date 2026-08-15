import { defineConfig } from 'eslint/config'

export default defineConfig([
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
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-debugger': 'error',
      'no-unused-vars': 'off', // TypeScript compiler already checks this
    },
  },
])
