import { index, jsonb, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const platform = pgSchema('platform');

export const seedRuns = platform.table(
  'seed_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profile: text('profile').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('seed_runs_profile_created_idx').on(table.profile, table.createdAt)],
);
