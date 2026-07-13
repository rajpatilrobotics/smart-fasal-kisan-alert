import { defineConfig } from 'drizzle-kit';

if (!process.env['DATABASE_URL']) {
  throw new Error('DATABASE_URL is required for Drizzle commands');
}

export default defineConfig({
  dialect: 'postgresql',
  out: './migrations',
  schema: './src/schema.ts',
  dbCredentials: { url: process.env['DATABASE_URL'] },
  strict: true,
  verbose: false,
});
