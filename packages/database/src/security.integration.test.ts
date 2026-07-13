import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const configuredDatabaseUrl = process.env['DATABASE_URL'];
const databaseUrl = configuredDatabaseUrl ?? 'postgres://localhost:1/smart_fasal_unconfigured';
const describeDatabase = configuredDatabaseUrl ? describe : describe.skip;

const ids = {
  retention: '00000000-0000-4000-8000-000000000101',
  farmerA: '00000000-0000-4000-8000-000000000201',
  farmerB: '00000000-0000-4000-8000-000000000202',
  rskA: '00000000-0000-4000-8000-000000000203',
  rskB: '00000000-0000-4000-8000-000000000204',
  officeA: '00000000-0000-4000-8000-000000000301',
  officeB: '00000000-0000-4000-8000-000000000302',
  jurisdictionA: '00000000-0000-4000-8000-000000000311',
  jurisdictionB: '00000000-0000-4000-8000-000000000312',
  farmerGrantA: '00000000-0000-4000-8000-000000000401',
  farmerGrantB: '00000000-0000-4000-8000-000000000402',
  rskGrantA: '00000000-0000-4000-8000-000000000403',
  rskGrantB: '00000000-0000-4000-8000-000000000404',
  farmerContextA: '00000000-0000-4000-8000-000000000411',
  farmerContextB: '00000000-0000-4000-8000-000000000412',
  rskContextA: '00000000-0000-4000-8000-000000000413',
  rskContextB: '00000000-0000-4000-8000-000000000414',
  target: '00000000-0000-4000-8000-000000000501',
  policy: '00000000-0000-4000-8000-000000000601',
  decision: '00000000-0000-4000-8000-000000000611',
  accessGrant: '00000000-0000-4000-8000-000000000621',
  correlation: '00000000-0000-4000-8000-000000000631',
  eventA: '00000000-0000-7000-8000-000000000641',
  eventB: '00000000-0000-7000-8000-000000000642',
} as const;

type Transaction = postgres.TransactionSql<Record<string, never>>;

describeDatabase('Milestone 1 PostgreSQL security spine', () => {
  const sql = postgres(databaseUrl, { max: 2, prepare: false });

  beforeAll(async () => {
    await sql`select 1`;
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  it('applies zero-to-current migrations in order', async () => {
    const migrations = await sql<{ name: string }[]>`
      select name from public.platform_migrations order by name
    `;
    expect(migrations.map(({ name }) => name)).toEqual([
      '0001_platform_foundation.sql',
      '0002_milestone_1_security_spine.sql',
    ]);
  });

  it('hardens every existing runtime role and gives no role operational ownership', async () => {
    const roles = await sql<
      {
        rolname: string;
        rolcanlogin: boolean;
        rolbypassrls: boolean;
        rolsuper: boolean;
        rolcreatedb: boolean;
        rolcreaterole: boolean;
        rolinherit: boolean;
      }[]
    >`
      select rolname, rolcanlogin, rolbypassrls, rolsuper,
             rolcreatedb, rolcreaterole, rolinherit
      from pg_roles where rolname like 'sf_%' order by rolname
    `;
    expect(roles).toHaveLength(12);
    expect(
      roles.every(
        (role) =>
          !role.rolcanlogin &&
          !role.rolbypassrls &&
          !role.rolsuper &&
          !role.rolcreatedb &&
          !role.rolcreaterole &&
          !role.rolinherit,
      ),
    ).toBe(true);

    const owned = await sql<{ count: number }[]>`
      select count(*)::int as count
      from pg_class
      where pg_get_userbyid(relowner) = any(${roles.map(({ rolname }) => rolname)})
    `;
    expect(owned[0]?.count).toBe(0);
    expect(roles.some(({ rolname }) => rolname === 'sf_mp_api')).toBe(false);
  });

  it('forces RLS on every protected Milestone 1 relation', async () => {
    const rows = await sql<{ count: number; all_forced: boolean }[]>`
      select count(*)::int as count,
             bool_and(relrowsecurity and relforcerowsecurity) as all_forced
      from pg_class
      where relnamespace in (
        'identity'::regnamespace,
        'consent'::regnamespace,
        'audit'::regnamespace,
        'platform'::regnamespace
      ) and relkind = 'r' and relrowsecurity
    `;
    expect(rows[0]?.count).toBeGreaterThanOrEqual(32);
    expect(rows[0]?.all_forced).toBe(true);
  });

  it('resolves a hashed auth subject before request GUCs without returning raw identity data', async () => {
    await rollbackAfter(sql, async (transaction) => {
      await seedAuthority(transaction);
      await transaction.unsafe('set local role sf_farmer_api');

      const resolved = await transaction<{ record: Record<string, unknown> }[]>`
        select to_jsonb(resolved) as record
        from identity.resolve_auth_subject(
          'firebase', ${'a'.repeat(64)}, 'demo'
        ) resolved
      `;
      expect(resolved).toEqual([
        {
          record: {
            subject_id: ids.farmerA,
            subject_type: 'FARMER',
            environment: 'demo',
            security_version: 1,
            status: 'ACTIVE',
          },
        },
      ]);

      const rawUid = await transaction<{ count: number }[]>`
        select count(*)::int as count
        from identity.resolve_auth_subject('firebase', 'raw-firebase-uid', 'demo')
      `;
      const wrongEnvironment = await transaction<{ count: number }[]>`
        select count(*)::int as count
        from identity.resolve_auth_subject('firebase', ${'a'.repeat(64)}, 'production')
      `;
      expect(rawUid[0]?.count).toBe(0);
      expect(wrongEnvironment[0]?.count).toBe(0);
    });
  });

  it('atomically rate limits auth return states by an HMAC-only installation key', async () => {
    await rollbackAfter(sql, async (transaction) => {
      await transaction.unsafe('set local role sf_auth_state_writer');
      for (let index = 0; index < 10; index += 1) {
        await transaction`
          select identity.create_auth_return_state(
            gen_random_uuid(), 'FARMER_HOME', 'demo', 'farmer-app',
            'https://farmer.example.test', ${index.toString(16).padStart(64, '0')},
            ${'c'.repeat(64)}, now() + interval '5 minutes', now()
          )
        `;
      }
      await expect(
        transaction.savepoint(
          (savepoint) => savepoint`
            select identity.create_auth_return_state(
              gen_random_uuid(), 'FARMER_HOME', 'demo', 'farmer-app',
              'https://farmer.example.test', ${'f'.repeat(64)}, ${'c'.repeat(64)},
              now() + interval '5 minutes', now()
            )
          `,
        ),
      ).rejects.toMatchObject({ code: 'P4290' });

      await expect(
        transaction.savepoint(
          (savepoint) => savepoint`
            select identity.create_auth_return_state(
              gen_random_uuid(), 'FARMER_HOME', 'demo', 'farmer-app',
              'https://farmer.example.test', ${'e'.repeat(64)}, ${'d'.repeat(64)},
              now() + interval '3 minutes', now() - interval '2 minutes'
            )
          `,
        ),
      ).rejects.toMatchObject({ code: '42501' });
    });
  });

  it('denies missing, malformed, forged and cross-Farmer request context', async () => {
    await rollbackAfter(sql, async (transaction) => {
      await seedAuthority(transaction);
      await transaction.unsafe('set local role sf_farmer_api');

      expect(await subjectIds(transaction)).toEqual([]);

      await setFarmerContext(transaction, ids.farmerA, ids.farmerContextA);
      expect(await subjectIds(transaction)).toEqual([ids.farmerA]);

      await transaction`select set_config('app.subject_id', 'malformed', true)`;
      expect(await subjectIds(transaction)).toEqual([]);

      await setFarmerContext(transaction, ids.farmerA, ids.farmerContextB);
      expect(await subjectIds(transaction)).toEqual([]);

      await setFarmerContext(transaction, ids.farmerA, ids.rskContextA);
      expect(await subjectIds(transaction)).toEqual([]);
    });
  });

  it('denies stale authorization versions, revoked contexts and surface-role confusion', async () => {
    await rollbackAfter(sql, async (transaction) => {
      await seedAuthority(transaction);
      await transaction`
        update identity.subject set authorization_version = 2 where subject_id = ${ids.farmerA}
      `;
      await transaction.unsafe('set local role sf_farmer_api');
      await setFarmerContext(transaction, ids.farmerA, ids.farmerContextA);
      expect(await subjectIds(transaction)).toEqual([]);
    });

    await rollbackAfter(sql, async (transaction) => {
      await seedAuthority(transaction);
      await transaction`
        update identity.role_context set revoked_at = now() where role_context_id = ${ids.farmerContextA}
      `;
      await transaction.unsafe('set local role sf_farmer_api');
      await setFarmerContext(transaction, ids.farmerA, ids.farmerContextA);
      expect(await subjectIds(transaction)).toEqual([]);
    });

    await rollbackAfter(sql, async (transaction) => {
      await seedAuthority(transaction);
      await transaction.unsafe('set local role sf_rsk_api');
      await setFarmerContext(transaction, ids.farmerA, ids.farmerContextA);
      expect(await subjectIds(transaction)).toEqual([]);

      await setRskContext(transaction, ids.rskA, ids.rskContextA, ids.officeA, ids.jurisdictionA);
      await transaction`select set_config('app.surface', 'FARMER', true)`;
      expect(await subjectIds(transaction)).toEqual([]);

      await setRskContext(transaction, ids.rskA, ids.rskContextA, ids.officeB, ids.jurisdictionA);
      expect(await subjectIds(transaction)).toEqual([]);
    });
  });

  it('scopes events by environment and owner and rejects a cross-tenant insert', async () => {
    await rollbackAfter(sql, async (transaction) => {
      await seedAuthority(transaction);
      await insertDomainEvent(transaction, ids.eventA, ids.farmerA);
      await insertDomainEvent(transaction, ids.eventB, ids.farmerB);
      await transaction.unsafe('set local role sf_farmer_api');
      await setFarmerContext(transaction, ids.farmerA, ids.farmerContextA);

      const visible = await transaction<{ event_id: string }[]>`
        select event_id::text from platform.domain_event order by event_id
      `;
      expect(visible).toEqual([{ event_id: ids.eventA }]);

      await expect(
        transaction.savepoint((savepoint) =>
          insertDomainEvent(savepoint, ids.correlation, ids.farmerB),
        ),
      ).rejects.toMatchObject({ code: '42501' });
    });
  });

  it('issues context-bound grants only through the capability-checked operation', async () => {
    await rollbackAfter(sql, async (transaction) => {
      await seedAuthority(transaction);
      const privileges = await transaction<{ direct_insert: boolean; event_insert: boolean }[]>`
        select
          has_table_privilege('sf_rsk_api', 'consent.access_grant', 'INSERT') as direct_insert,
          has_table_privilege('sf_rsk_api', 'consent.access_grant_event', 'INSERT') as event_insert
      `;
      expect(privileges).toEqual([{ direct_insert: false, event_insert: false }]);

      // A null consent expiry is an ongoing consent, not an already-expired consent.
      await transaction`
        update consent.current_state
        set expires_at = null
        where subject_id = ${ids.farmerA} and target_id = ${ids.target}
      `;

      await transaction.unsafe('set local role sf_rsk_api');
      await setRskContext(transaction, ids.rskA, ids.rskContextA, ids.officeA, ids.jurisdictionA);
      const issued = await transaction<{ access_grant_id: string }[]>`
        select consent.issue_access_grant(
          ${ids.accessGrant}::uuid,
          ${ids.farmerA}::uuid,
          ${ids.target}::uuid,
          1,
          now() + interval '10 minutes',
          ${ids.correlation}::uuid
        )::text as access_grant_id
      `;
      expect(issued).toEqual([{ access_grant_id: ids.accessGrant }]);

      const ownGrant = await transaction<{ role_context_id: string }[]>`
        select role_context_id::text from consent.access_grant
      `;
      expect(ownGrant).toEqual([{ role_context_id: ids.rskContextA }]);

      await transaction.unsafe('reset role');
      await transaction.unsafe('set local role sf_rsk_api');
      await setRskContext(transaction, ids.rskB, ids.rskContextB, ids.officeB, ids.jurisdictionB);
      const crossOffice = await transaction<{ count: number }[]>`
        select count(*)::int as count from consent.access_grant
      `;
      expect(crossOffice[0]?.count).toBe(0);
    });
  });

  it('revokes assisted grants only for the owning Farmer and current withdrawn access version', async () => {
    await rollbackAfter(sql, async (transaction) => {
      await seedAuthority(transaction);
      await transaction.unsafe('set local role sf_rsk_api');
      await setRskContext(transaction, ids.rskA, ids.rskContextA, ids.officeA, ids.jurisdictionA);
      await transaction`
        select consent.issue_access_grant(
          ${ids.accessGrant}::uuid, ${ids.farmerA}::uuid, ${ids.target}::uuid,
          1, now() + interval '10 minutes', ${ids.correlation}::uuid
        )
      `;

      await transaction.unsafe('reset role');
      await transaction`
        update consent.current_state
        set state = 'WITHDRAWN', access_version = 2, expires_at = null
        where subject_id = ${ids.farmerA} and target_id = ${ids.target}
      `;

      await transaction.unsafe('set local role sf_rsk_api');
      await setRskContext(transaction, ids.rskA, ids.rskContextA, ids.officeA, ids.jurisdictionA);
      const visibleAfterWithdrawal = await transaction<{ count: number }[]>`
        select count(*)::int as count from consent.access_grant
      `;
      expect(visibleAfterWithdrawal[0]?.count).toBe(0);

      await transaction.unsafe('reset role');
      await transaction.unsafe('set local role sf_farmer_api');
      await setFarmerContext(transaction, ids.farmerB, ids.farmerContextB);
      await expect(
        transaction.savepoint(
          (savepoint) =>
            savepoint`
            select consent.revoke_subject_access_grants(
              ${ids.farmerA}::uuid, 'assisted_service.access', 'assisted.service',
              'ASSISTED_FARMER_CONTEXT', ${ids.target}::uuid, 2, ${ids.correlation}::uuid
            )
          `,
        ),
      ).rejects.toMatchObject({ code: '42501' });

      await setFarmerContext(transaction, ids.farmerA, ids.farmerContextA);
      const revoked = await transaction<{ count: number }[]>`
        select consent.revoke_subject_access_grants(
          ${ids.farmerA}::uuid, 'assisted_service.access', 'assisted.service',
          'ASSISTED_FARMER_CONTEXT', ${ids.target}::uuid, 2, ${ids.correlation}::uuid
        ) as count
      `;
      expect(revoked[0]?.count).toBe(1);

      const state = await transaction<
        { access_version: number; grant_version: number; revoked: boolean }[]
      >`
        select access_version::int, grant_version::int, revoked_at is not null as revoked
        from consent.access_grant
      `;
      expect(state).toEqual([{ access_version: 2, grant_version: 2, revoked: true }]);
    });
  });

  it('returns protected ciphertext only after a same-transaction ALLOW Audit fact', async () => {
    await rollbackAfter(sql, async (transaction) => {
      await seedAuthority(transaction);
      await transaction`
        insert into identity.subject_private (
          subject_id, encrypted_display_name, encrypted_contact, key_reference
        ) values (
          ${ids.farmerA}, decode('0102', 'hex'), decode('0304', 'hex'), 'kms/test-only'
        )
      `;
      const privileges = await transaction<{ direct_select: boolean }[]>`
        select has_table_privilege(
          'sf_rsk_api', 'identity.subject_private', 'SELECT'
        ) as direct_select
      `;
      expect(privileges).toEqual([{ direct_select: false }]);

      await transaction.unsafe('set local role sf_rsk_api');
      await setRskContext(transaction, ids.rskA, ids.rskContextA, ids.officeA, ids.jurisdictionA);
      await transaction`
        select consent.issue_access_grant(
          ${ids.accessGrant}::uuid, ${ids.farmerA}::uuid, ${ids.target}::uuid,
          1, now() + interval '10 minutes', ${ids.correlation}::uuid
        )
      `;

      const beforeAudit = await transaction<{ key_reference: string }[]>`
        select key_reference from identity.read_protected_fields_after_audit(
          ${ids.target}::uuid, ${ids.correlation}::uuid
        )
      `;
      expect(beforeAudit).toEqual([]);

      await transaction`
        select audit.write_fact(
          'rsk.protected_disclosure', 'ASSISTED_FARMER_CONTEXT', ${ids.target}::uuid,
          'ALLOW', 'AUTHORIZED', ${ids.correlation}::uuid
        )
      `;
      const afterAudit = await transaction<
        { display_name: string; contact: string; key_reference: string }[]
      >`
        select encode(encrypted_display_name, 'hex') as display_name,
               encode(encrypted_contact, 'hex') as contact,
               key_reference
        from identity.read_protected_fields_after_audit(
          ${ids.target}::uuid, ${ids.correlation}::uuid
        )
      `;
      expect(afterAudit).toEqual([
        { display_name: '0102', contact: '0304', key_reference: 'kms/test-only' },
      ]);

      await transaction.unsafe('reset role');
      await transaction`
        update consent.current_state set expires_at = now() - interval '1 second'
        where subject_id = ${ids.farmerA} and target_id = ${ids.target}
      `;
      await transaction.unsafe('set local role sf_rsk_api');
      await setRskContext(transaction, ids.rskA, ids.rskContextA, ids.officeA, ids.jurisdictionA);
      const expired = await transaction<{ consent_state: string }[]>`
        select consent.disclosure_snapshot(${ids.target}::uuid)->>'consentState' as consent_state
      `;
      expect(expired).toEqual([{ consent_state: 'EXPIRED' }]);
      const afterExpiry = await transaction<{ count: number }[]>`
        select count(*)::int as count
        from identity.read_protected_fields_after_audit(
          ${ids.target}::uuid, ${ids.correlation}::uuid
        )
      `;
      expect(afterExpiry).toEqual([{ count: 0 }]);
    });
  });

  it('keeps audit writes surface-bound and denies direct table insertion', async () => {
    await rollbackAfter(sql, async (transaction) => {
      await seedAuthority(transaction);
      const direct = await transaction<{ allowed: boolean }[]>`
        select has_table_privilege('sf_rsk_api', 'audit.fact', 'INSERT') as allowed
      `;
      expect(direct[0]?.allowed).toBe(false);

      await transaction.unsafe('set local role sf_farmer_api');
      await setRskContext(transaction, ids.rskA, ids.rskContextA, ids.officeA, ids.jurisdictionA);
      await expect(
        transaction.savepoint(
          (savepoint) =>
            savepoint`
            select audit.write_fact(
              'protected.disclose', 'ASSISTED_FARMER_CONTEXT', ${ids.target}::uuid,
              'ALLOW', 'AUTHORIZED', ${ids.correlation}::uuid
            )
          `,
        ),
      ).rejects.toMatchObject({ code: '42501' });

      await transaction.unsafe('reset role');
      await transaction.unsafe('set local role sf_rsk_api');
      await setRskContext(transaction, ids.rskA, ids.rskContextA, ids.officeA, ids.jurisdictionA);
      const written = await transaction<{ audit_fact_id: string }[]>`
        select audit.write_fact(
          'protected.disclose', 'ASSISTED_FARMER_CONTEXT', ${ids.target}::uuid,
          'ALLOW', 'AUTHORIZED', ${ids.correlation}::uuid
        )::text as audit_fact_id
      `;
      expect(written[0]?.audit_fact_id).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  it('does not reuse transaction-local context across pooled transactions', async () => {
    await rollbackAfter(sql, async (transaction) => {
      await seedAuthority(transaction);
      await transaction.unsafe('set local role sf_farmer_api');
      await setFarmerContext(transaction, ids.farmerA, ids.farmerContextA);
      expect(await subjectIds(transaction)).toEqual([ids.farmerA]);
    });

    await rollbackAfter(sql, async (transaction) => {
      await transaction.unsafe('set local role sf_farmer_api');
      expect(await subjectIds(transaction)).toEqual([]);
    });
  });

  it('rejects updates to append-only facts', async () => {
    await rollbackAfter(sql, async (transaction) => {
      await seedAuthority(transaction);
      await insertDomainEvent(transaction, ids.eventA, ids.farmerA);
      await expect(
        transaction.savepoint(
          (savepoint) =>
            savepoint`
            update platform.domain_event set aggregate_revision = 2
            where event_id = ${ids.eventA}
          `,
        ),
      ).rejects.toMatchObject({ code: '55000' });
    });
  });
});

async function rollbackAfter(
  sql: postgres.Sql<Record<string, never>>,
  work: (transaction: Transaction) => Promise<void>,
): Promise<void> {
  const rollback = new Error('test rollback');
  try {
    await sql.begin(async (transaction) => {
      await work(transaction);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

async function seedAuthority(transaction: Transaction): Promise<void> {
  await transaction`
    insert into identity.office (office_id, office_code, display_name) values
      (${ids.officeA}, 'TEST-A', 'Test office A'),
      (${ids.officeB}, 'TEST-B', 'Test office B')
    on conflict (office_id) do nothing
  `;
  await transaction`
    insert into identity.jurisdiction (jurisdiction_id, jurisdiction_code, display_name) values
      (${ids.jurisdictionA}, 'TEST-J-A', 'Test jurisdiction A'),
      (${ids.jurisdictionB}, 'TEST-J-B', 'Test jurisdiction B')
    on conflict (jurisdiction_id) do nothing
  `;
  await transaction`
    insert into identity.office_jurisdiction (office_id, jurisdiction_id, valid_from) values
      (${ids.officeA}, ${ids.jurisdictionA}, now() - interval '1 day'),
      (${ids.officeB}, ${ids.jurisdictionB}, now() - interval '1 day')
    on conflict do nothing
  `;
  await transaction`
    insert into identity.subject (
      subject_id, subject_type, environment, retention_policy_id, retain_until
    ) values
      (${ids.farmerA}, 'FARMER', 'demo', ${ids.retention}, now() + interval '1 day'),
      (${ids.farmerB}, 'FARMER', 'demo', ${ids.retention}, now() + interval '1 day'),
      (${ids.rskA}, 'STAFF', 'demo', ${ids.retention}, now() + interval '1 day'),
      (${ids.rskB}, 'STAFF', 'demo', ${ids.retention}, now() + interval '1 day')
    on conflict (subject_id) do nothing
  `;
  await transaction`
    insert into identity.auth_identity (
      subject_id, provider, provider_subject_hash, environment
    ) values (${ids.farmerA}, 'firebase', ${'a'.repeat(64)}, 'demo')
    on conflict (provider, provider_subject_hash, environment) do nothing
  `;
  await transaction`
    insert into identity.role_grant (
      role_grant_id, subject_id, role_type, office_id, jurisdiction_id,
      capability_set_version, valid_from, valid_until
    ) values
      (${ids.farmerGrantA}, ${ids.farmerA}, 'FARMER', null, null, 1,
       now() - interval '1 minute', now() + interval '2 hours'),
      (${ids.farmerGrantB}, ${ids.farmerB}, 'FARMER', null, null, 1,
       now() - interval '1 minute', now() + interval '2 hours'),
      (${ids.rskGrantA}, ${ids.rskA}, 'RSK', ${ids.officeA}, ${ids.jurisdictionA}, 1,
       now() - interval '1 minute', now() + interval '2 hours'),
      (${ids.rskGrantB}, ${ids.rskB}, 'RSK', ${ids.officeB}, ${ids.jurisdictionB}, 1,
       now() - interval '1 minute', now() + interval '2 hours')
    on conflict (role_grant_id) do nothing
  `;
  await transaction`
    insert into identity.role_capability (
      role_type, capability_key, capability_set_version
    ) values
      ('RSK', 'rsk.access_grant.issue', 1),
      ('RSK', 'audit.investigate_sensitive', 1)
    on conflict do nothing
  `;
  await transaction`
    insert into identity.assisted_context (
      assisted_context_id, farmer_subject_id, office_id, jurisdiction_id,
      assigned_staff_subject_id, assignment_state, valid_from
    ) values (
      ${ids.target}, ${ids.farmerA}, ${ids.officeA}, ${ids.jurisdictionA},
      ${ids.rskA}, 'ASSIGNED', now() - interval '1 minute'
    ) on conflict (assisted_context_id) do nothing
  `;
  await transaction`
    insert into identity.role_context (
      role_context_id, role_grant_id, subject_id, role_type, office_id, jurisdiction_id,
      purpose_code, authorization_version, capability_set_version, expires_at
    ) values
      (${ids.farmerContextA}, ${ids.farmerGrantA}, ${ids.farmerA}, 'FARMER', null, null,
       'farmer.self_service', 1, 1, now() + interval '1 hour'),
      (${ids.farmerContextB}, ${ids.farmerGrantB}, ${ids.farmerB}, 'FARMER', null, null,
       'farmer.self_service', 1, 1, now() + interval '1 hour'),
      (${ids.rskContextA}, ${ids.rskGrantA}, ${ids.rskA}, 'RSK',
       ${ids.officeA}, ${ids.jurisdictionA}, 'assisted.service', 1, 1, now() + interval '1 hour'),
      (${ids.rskContextB}, ${ids.rskGrantB}, ${ids.rskB}, 'RSK',
       ${ids.officeB}, ${ids.jurisdictionB}, 'assisted.service', 1, 1, now() + interval '1 hour')
    on conflict (role_context_id) do nothing
  `;
  await transaction`
    insert into consent.policy_version (
      policy_version_id, scope_key, purpose_key, version, locale,
      notice_digest, effective_at
    ) values (
      ${ids.policy}, 'assisted_service.access', 'assisted.service', 1, 'en',
      ${'b'.repeat(64)}, now() - interval '1 day'
    ) on conflict (policy_version_id) do nothing
  `;
  await transaction`
    insert into consent.decision (
      consent_decision_id, subject_id, scope_key, purpose_key, target_kind, target_id,
      decision, policy_version_id, access_version, expires_at, actor_subject_id,
      correlation_id
    ) values (
      ${ids.decision}, ${ids.farmerA}, 'assisted_service.access', 'assisted.service',
      'ASSISTED_FARMER_CONTEXT', ${ids.target}, 'ALLOW', ${ids.policy}, 1,
      now() + interval '45 minutes', ${ids.farmerA}, ${ids.correlation}
    ) on conflict (consent_decision_id) do nothing
  `;
  await transaction`
    insert into consent.current_state (
      subject_id, scope_key, purpose_key, target_kind, target_id, consent_decision_id,
      state, access_version, expires_at
    ) values (
      ${ids.farmerA}, 'assisted_service.access', 'assisted.service',
      'ASSISTED_FARMER_CONTEXT', ${ids.target}, ${ids.decision}, 'ALLOWED', 1,
      now() + interval '45 minutes'
    ) on conflict (subject_id, scope_key, purpose_key, target_kind, target_id) do nothing
  `;
}

async function setFarmerContext(
  transaction: Transaction,
  subjectId: string,
  roleContextId: string,
): Promise<void> {
  await setRequestContext(transaction, {
    environment: 'demo',
    surface: 'FARMER',
    subjectId,
    roleContextId,
    roleType: 'FARMER',
    purposeCode: 'farmer.self_service',
    officeId: '00000000-0000-0000-0000-000000000000',
    jurisdictionId: '00000000-0000-0000-0000-000000000000',
    authorizationVersion: '1',
  });
}

async function setRskContext(
  transaction: Transaction,
  subjectId: string,
  roleContextId: string,
  officeId: string,
  jurisdictionId: string,
): Promise<void> {
  await setRequestContext(transaction, {
    environment: 'demo',
    surface: 'RSK',
    subjectId,
    roleContextId,
    roleType: 'RSK',
    purposeCode: 'assisted.service',
    officeId,
    jurisdictionId,
    authorizationVersion: '1',
  });
}

async function setRequestContext(
  transaction: Transaction,
  context: {
    environment: string;
    surface: string;
    subjectId: string;
    roleContextId: string;
    roleType: string;
    purposeCode: string;
    officeId: string;
    jurisdictionId: string;
    authorizationVersion: string;
  },
): Promise<void> {
  const settings = [
    ['app.environment', context.environment],
    ['app.surface', context.surface],
    ['app.subject_id', context.subjectId],
    ['app.role_context_id', context.roleContextId],
    ['app.role_type', context.roleType],
    ['app.purpose_code', context.purposeCode],
    ['app.office_id', context.officeId],
    ['app.jurisdiction_id', context.jurisdictionId],
    ['app.authorization_version', context.authorizationVersion],
  ] as const;
  for (const [name, value] of settings) {
    await transaction`select set_config(${name}, ${value}, true)`;
  }
}

async function subjectIds(transaction: Transaction): Promise<string[]> {
  const rows = await transaction<{ subject_id: string }[]>`
    select subject_id::text from identity.subject order by subject_id
  `;
  return rows.map(({ subject_id }) => subject_id);
}

async function insertDomainEvent(
  transaction: Transaction,
  eventId: string,
  ownerSubjectId: string,
): Promise<void> {
  await transaction`
    insert into platform.domain_event (
      event_id, environment, owner_subject_id, event_type, event_version,
      aggregate_type, aggregate_id, aggregate_revision, event_ordinal,
      server_received_at, committed_at, actor_type, actor_ref, data_mode,
      provenance_types, mode_derivation_version, payload, classification,
      retention_policy_id, occurred_at, correlation_id, causation_id,
      producer_service, producer_build, retention_class, payload_schema_version,
      payload_checksum
    ) values (
      ${eventId}, 'demo', ${ownerSubjectId}, 'consent.decision_recorded', 1,
      'ConsentDecision', ${ownerSubjectId}, 1, 1, now(), now(), 'FARMER',
      ${ownerSubjectId}, 'SIMULATED', array['FARMER_MANUAL'],
      'm1-command-environment-v1', '{}'::jsonb, 'C2',
      '00000000-0000-4000-8000-000000000104', now(), ${ids.correlation},
      ${ids.correlation}, 'domain-api', 'integration-test', 'event-default', 1,
      ${`sha256:${'a'.repeat(64)}`}
    )
  `;
}
