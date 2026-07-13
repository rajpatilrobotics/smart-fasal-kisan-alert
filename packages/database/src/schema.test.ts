import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createDatabaseClient } from './client';
import { seedRuns } from './schema';

describe('foundation migration', () => {
  it('enables required spatial and cryptographic extensions', async () => {
    const migration = await readFile(resolve('migrations/0001_platform_foundation.sql'), 'utf8');
    expect(migration).toContain('create extension if not exists postgis');
    expect(migration).toContain('create extension if not exists pgcrypto');
  });

  it('exposes the typed foundation schema', () => {
    expect(seedRuns.profile.name).toBe('profile');
  });

  it('requires an explicit database URL', () => {
    const previous = process.env['DATABASE_URL'];
    delete process.env['DATABASE_URL'];
    try {
      expect(() => createDatabaseClient()).toThrow('DATABASE_URL is required');
    } finally {
      if (previous) process.env['DATABASE_URL'] = previous;
    }
  });

  it('constructs and closes a lazy local client without connecting', async () => {
    const client = createDatabaseClient('postgresql://local:local@127.0.0.1:5432/local');
    expect(client.db).toBeDefined();
    await client.close();
  });
});
