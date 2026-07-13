import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import postgres from 'postgres';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const migrationsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../migrations');
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
  .sort((left, right) => left.localeCompare(right));

const sql = postgres(databaseUrl, { max: 1, prepare: false });

try {
  await sql`select pg_advisory_lock(836_272_501)`;
  await sql`
    create table if not exists public.platform_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const applied = new Set(
    (await sql<{ name: string }[]>`select name from public.platform_migrations`).map(
      ({ name }) => name,
    ),
  );

  for (const filename of migrationFiles) {
    if (applied.has(filename)) continue;
    const source = await readFile(resolve(migrationsDirectory, filename), 'utf8');
    await sql.begin(async (transaction) => {
      await transaction.unsafe(source);
      await transaction`insert into public.platform_migrations (name) values (${filename})`;
    });
  }
} finally {
  await sql`select pg_advisory_unlock(836_272_501)`.catch(() => undefined);
  await sql.end({ timeout: 5 });
}
