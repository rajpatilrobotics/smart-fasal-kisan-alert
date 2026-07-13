import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createDatabaseClient } from './client';
import { seedRuns } from './schema';

describe('foundation migration', () => {
  it('enables required spatial and cryptographic extensions', async () => {
    const migration = await readFile(
      resolve(import.meta.dirname, '../migrations/0001_platform_foundation.sql'),
      'utf8',
    );
    expect(migration).toContain('create extension if not exists postgis');
    expect(migration).toContain('create extension if not exists pgcrypto');
  });

  it('adds forced RLS, transaction-local context and every non-login service role', async () => {
    const migration = await readFile(
      resolve(import.meta.dirname, '../migrations/0002_milestone_1_security_spine.sql'),
      'utf8',
    );
    expect(migration).toContain('force row level security');
    expect(migration).toContain("platform.request_bigint('app.authorization_version')");
    expect(migration).toContain(
      'nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls',
    );
    expect(migration).toMatch(
      /alter role %I nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls/,
    );
    expect(migration).not.toMatch(/create role[^\n]*sf_mp_api/);
    expect(migration).toContain('no sf_mp_api role');
  });

  it('verifies current server authority and binds the database role to the requested surface', async () => {
    const migration = await readFile(
      resolve(import.meta.dirname, '../migrations/0002_milestone_1_security_spine.sql'),
      'utf8',
    );
    expect(migration).toContain('platform.subject_authority_projection');
    expect(migration).toContain('platform.role_grant_authority_projection');
    expect(migration).toContain('platform.role_context_authority_projection');
    expect(migration).toContain(
      'subject.authorization_version = role_context.authorization_version',
    );
    expect(migration).toContain('role_context.revoked_at is null');
    expect(migration).toContain('role_grant.revoked_at is null');
    expect(migration).toContain('office_jurisdiction.valid_until > statement_timestamp()');
    expect(migration).toContain('and office.active');
    expect(migration).toContain('and jurisdiction.active');
    expect(migration).toContain("case current_setting('role', true)");
    expect(migration).toContain("when 'sf_farmer_api'");
    expect(migration).toContain("when 'sf_rsk_api'");
  });

  it('resolves only a hashed environment-bound authentication subject before request context', async () => {
    const migration = await readFile(
      resolve(import.meta.dirname, '../migrations/0002_milestone_1_security_spine.sql'),
      'utf8',
    );
    expect(migration).toContain('create or replace function identity.resolve_auth_subject');
    expect(migration).toContain("provider_subject_digest ~ '^[0-9a-f]{64}$'");
    expect(migration).toContain('security definer\nset search_path = pg_catalog, identity');
    expect(migration).toContain(
      'grant execute on function identity.resolve_auth_subject(text, text, text)',
    );
    const resolverStart = migration.indexOf(
      'create or replace function identity.resolve_auth_subject',
    );
    const resolverReturnSignature = migration.slice(
      resolverStart,
      migration.indexOf('language sql', resolverStart),
    );
    expect(resolverReturnSignature).not.toContain('provider_subject_hash');
  });

  it('defines append-only consent, Audit, command, event, outbox and inbox relations', async () => {
    const migration = await readFile(
      resolve(import.meta.dirname, '../migrations/0002_milestone_1_security_spine.sql'),
      'utf8',
    );
    for (const relation of [
      'consent.decision',
      'consent.current_state',
      'platform.command_execution',
      'platform.domain_event',
      'platform.integration_event',
      'platform.outbox',
      'platform.consumer_inbox',
      'audit.fact',
    ]) {
      expect(migration).toContain(`create table ${relation}`);
    }
    expect(migration).toContain('primary key (consumer_name, event_id)');
    expect(migration).toContain("command_hash ~ '^[0-9a-f]{64}$'");
    expect(migration).toContain('claim_token uuid');
    expect(migration).toContain('role_context_id uuid not null references identity.role_context');
  });

  it('removes direct access-grant and Audit writes in favor of fenced operations', async () => {
    const migration = await readFile(
      resolve(import.meta.dirname, '../migrations/0002_milestone_1_security_spine.sql'),
      'utf8',
    );
    expect(migration).toContain('create or replace function consent.issue_access_grant');
    expect(migration).toContain('create or replace function consent.revoke_subject_access_grants');
    expect(migration).toContain('create or replace function audit.write_fact');
    expect(migration).toContain('create or replace function platform.consent_access_current');
    expect(migration).not.toMatch(/grant\s+insert[^;]*consent\.access_grant[^;]*sf_rsk_api/i);
    expect(migration).not.toMatch(/grant\s+insert[^;]*audit\.fact[^;]*sf_(?:farmer|rsk)_api/i);
    expect(migration).toContain("role_context_id = platform.request_uuid('app.role_context_id')");
    expect(migration).toContain('create or replace function consent.disclosure_snapshot');
    expect(migration).toContain(
      'create or replace function identity.read_protected_fields_after_audit',
    );
    expect(migration).toContain('fact.transaction_id = txid_current()');
    expect(migration).not.toMatch(/grant\s+select[^;]*identity\.subject_private[^;]*sf_rsk_api/i);
  });

  it('rate limits return-state creation using only a stable HMAC digest', async () => {
    const migration = await readFile(
      resolve(import.meta.dirname, '../migrations/0002_milestone_1_security_spine.sql'),
      'utf8',
    );
    expect(migration).toContain('rate_limit_key text not null');
    expect(migration).toContain("pg_advisory_xact_lock(hashtextextended('auth-return-state:'");
    expect(migration).toContain("created_at_value < statement_timestamp() - interval '1 minute'");
    expect(migration).toContain("created_at >= statement_timestamp() - interval '1 minute'");
    expect(migration).toContain('select count(*) >= 10');
    expect(migration).toContain("errcode = 'P4290'");
    expect(migration).not.toContain('ip_address');
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
