import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';

import * as schema from './schema';

export interface DatabaseClient {
  db: PostgresJsDatabase<typeof schema>;
  sql: Sql;
  close: () => Promise<void>;
}

export function createDatabaseClient(databaseUrl = process.env['DATABASE_URL']): DatabaseClient {
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const sql = postgres(databaseUrl, {
    max: process.env['NODE_ENV'] === 'test' ? 1 : 10,
    prepare: false,
  });

  return {
    db: drizzle(sql, { schema }),
    sql,
    close: async () => sql.end({ timeout: 5 }),
  };
}
