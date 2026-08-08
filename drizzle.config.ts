// @ts-ignore
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './lib/db/erp-schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL!,
  },
})
