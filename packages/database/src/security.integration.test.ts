import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const configuredDatabaseUrl = resolveDatabaseUrl(process.env);
const databaseUrl = configuredDatabaseUrl ?? 'postgres://localhost:1/smart_fasal_unconfigured';
const describeDatabase = configuredDatabaseUrl ? describe : describe.skip;

function resolveDatabaseUrl(environment: NodeJS.ProcessEnv): string | undefined {
  const explicitDatabaseUrl = environment['DATABASE_URL'];
  if (explicitDatabaseUrl) return explicitDatabaseUrl;

  const runId = environment['GITHUB_RUN_ID'];
  const runAttempt = environment['GITHUB_RUN_ATTEMPT'];
  if (
    environment['GITHUB_ACTIONS'] !== 'true' ||
    environment['GITHUB_WORKFLOW'] !== 'CI' ||
    environment['GITHUB_JOB'] !== 'quality' ||
    !runId ||
    !runAttempt ||
    !/^\d+$/.test(runId) ||
    !/^\d+$/.test(runAttempt)
  ) {
    return undefined;
  }

  // The CI quality job's PostGIS service uses this deterministic, run-scoped
  // password. GitHub's default variables survive Turbo strict mode even when
  // DATABASE_URL does not.
  return `postgresql://smart_fasal:${runId}-${runAttempt}@127.0.0.1:5432/smart_fasal`;
}

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
  farmerBindingA: '00000000-0000-4000-8000-000000000421',
  farmerBindingB: '00000000-0000-4000-8000-000000000422',
  syncStreamA: '00000000-0000-4000-8000-000000000431',
  syncStreamB: '00000000-0000-4000-8000-000000000432',
  target: '00000000-0000-4000-8000-000000000501',
  policy: '00000000-0000-4000-8000-000000000601',
  audioPolicy: '00000000-0000-4000-8000-000000000602',
  decision: '00000000-0000-4000-8000-000000000611',
  audioDecision: '00000000-0000-4000-8000-000000000612',
  accessGrant: '00000000-0000-4000-8000-000000000621',
  rowLockProbeGrant: '00000000-0000-4000-8000-000000000622',
  staleConsentGrant: '00000000-0000-4000-8000-000000000623',
  crossOfficeGrant: '00000000-0000-4000-8000-000000000624',
  correlation: '00000000-0000-4000-8000-000000000631',
  eventA: '00000000-0000-7000-8000-000000000641',
  eventB: '00000000-0000-7000-8000-000000000642',
  mediaIntent: '00000000-0000-4000-8000-000000000651',
  mediaAsset: '00000000-0000-4000-8000-000000000652',
  mediaOwner: '00000000-0000-4000-8000-000000000653',
  mediaScanClaim: '00000000-0000-4000-8000-000000000654',
  mediaScanResult: '00000000-0000-4000-8000-000000000655',
  mediaStorageEvent: '00000000-0000-4000-8000-000000000656',
  mediaDerivative: '00000000-0000-4000-8000-000000000657',
  voiceTicket: '00000000-0000-4000-8000-000000000661',
  voiceConnection: '00000000-0000-4000-8000-000000000662',
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
      '0003_assisted_context_row_lock_permission.sql',
      '0004_milestone_2_offline_media_voice.sql',
      '0005_milestone_3_farmer_farm_setup.sql',
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
    expect(roles).toHaveLength(14);
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
    expect(roles.some(({ rolname }) => rolname === 'sf_media_scanner')).toBe(true);
    expect(roles.some(({ rolname }) => rolname === 'sf_voice_gateway')).toBe(true);

    const scannerPrivileges = await sql<
      {
        broadSelect: boolean;
        columnSelect: boolean;
        broadUpdate: boolean;
        columnUpdate: boolean;
        uploadIntentSelect: boolean;
      }[]
    >`
      select
        has_table_privilege('sf_media_scanner', 'media.asset', 'SELECT') as "broadSelect",
        has_any_column_privilege('sf_media_scanner', 'media.asset', 'SELECT') as "columnSelect",
        has_table_privilege('sf_media_scanner', 'media.asset', 'UPDATE') as "broadUpdate",
        has_any_column_privilege('sf_media_scanner', 'media.asset', 'UPDATE') as "columnUpdate",
        has_table_privilege(
          'sf_media_scanner', 'media.upload_intent', 'SELECT'
        ) as "uploadIntentSelect"
    `;
    expect(scannerPrivileges).toEqual([
      {
        broadSelect: false,
        columnSelect: true,
        broadUpdate: false,
        columnUpdate: true,
        uploadIntentSelect: false,
      },
    ]);

    const voicePrivileges = await sql<
      {
        broadProposalUpdate: boolean;
        proposalStateUpdate: boolean;
        proposalPayloadUpdate: boolean;
        ticketHashUpdate: boolean;
        ticketConsumeUpdate: boolean;
        ticketConsumeFunction: boolean;
      }[]
    >`
      select
        has_table_privilege(
          'sf_voice_gateway', 'voice.proposal', 'UPDATE'
        ) as "broadProposalUpdate",
        has_column_privilege(
          'sf_voice_gateway', 'voice.proposal', 'state', 'UPDATE'
        ) as "proposalStateUpdate",
        has_column_privilege(
          'sf_voice_gateway', 'voice.proposal', 'canonical_payload', 'UPDATE'
        ) as "proposalPayloadUpdate",
        has_column_privilege(
          'sf_voice_gateway', 'voice.ticket', 'ticket_hash', 'UPDATE'
        ) as "ticketHashUpdate",
        has_column_privilege(
          'sf_voice_gateway', 'voice.ticket', 'consumed_at', 'UPDATE'
        ) as "ticketConsumeUpdate",
        has_function_privilege(
          'sf_voice_gateway', 'voice.consume_ticket(text,text,uuid)', 'EXECUTE'
        ) as "ticketConsumeFunction"
    `;
    expect(voicePrivileges).toEqual([
      {
        broadProposalUpdate: false,
        proposalStateUpdate: true,
        proposalPayloadUpdate: false,
        ticketHashUpdate: false,
        ticketConsumeUpdate: false,
        ticketConsumeFunction: true,
      },
    ]);

    await rollbackAfter(sql, async (transaction) => {
      await seedAuthority(transaction);
      await transaction.unsafe('set local role sf_voice_gateway');
      await setFarmerContext(transaction, ids.farmerA, ids.farmerContextA);
      await transaction`
        insert into voice.session (
          session_id, environment, subject_id, subject_device_binding_id,
          role_context_id, authorization_version, purpose_code, origin,
          language, visual_route, expires_at
        ) values (
          ${ids.mediaOwner}, 'demo', ${ids.farmerA}, ${ids.farmerBindingA},
          ${ids.farmerContextA}, 1, 'farmer.self_service',
          'https://farmer.example.test', 'en', '/farmer/today',
          now() + interval '15 minutes'
        )
      `;
      await transaction`
        insert into voice.ticket (
          ticket_id, session_id, environment, subject_id,
          subject_device_binding_id, ticket_hash, role_context_id,
          authorization_version, purpose_code, origin, language,
          visual_route, expires_at
        ) values (
          ${ids.voiceTicket}, ${ids.mediaOwner}, 'demo', ${ids.farmerA},
          ${ids.farmerBindingA}, ${`sha256:${'e'.repeat(64)}`},
          ${ids.farmerContextA}, 1, 'farmer.self_service',
          'https://farmer.example.test', 'en', '/farmer/today',
          now() + interval '60 seconds'
        )
      `;
      const wrongOriginTicket = await transaction`
        select * from voice.consume_ticket(
          ${`sha256:${'e'.repeat(64)}`}, 'https://attacker.example.test',
          ${ids.voiceConnection}
        )
      `;
      expect(wrongOriginTicket).toEqual([]);
      const consumedTicket = await transaction<{ session_id: string }[]>`
        select session_id::text from voice.consume_ticket(
          ${`sha256:${'e'.repeat(64)}`}, 'https://farmer.example.test',
          ${ids.voiceConnection}
        )
      `;
      expect(consumedTicket).toEqual([{ session_id: ids.mediaOwner }]);
      const replayedTicket = await transaction`
        select * from voice.consume_ticket(
          ${`sha256:${'e'.repeat(64)}`}, 'https://farmer.example.test',
          ${ids.voiceConnection}
        )
      `;
      expect(replayedTicket).toEqual([]);

      await transaction.unsafe('reset role');
      await transaction.unsafe('set local role sf_farmer_api');
      await setFarmerContext(transaction, ids.farmerA, ids.farmerContextA);
      await transaction`
        insert into media.upload_intent (
          intent_id, asset_id, environment, owner_subject_id,
          subject_device_binding_id, purpose, owner_type, owner_id,
          expected_sha256, claimed_mime_type, declared_size_bytes,
          consent_access_version, storage_object_name, generation_precondition,
          expires_at
        ) values (
          ${ids.mediaIntent}, ${ids.mediaAsset}, 'demo', ${ids.farmerA},
          ${ids.farmerBindingA}, 'VOICE_OFFLINE_AUDIO', 'VOICE_SESSION',
          ${ids.mediaOwner}, ${`sha256:${'c'.repeat(64)}`}, 'audio/wav', 128,
          1, 'quarantine/test-media-asset', 0, now() + interval '10 minutes'
        )
      `;
      await transaction`
        insert into media.asset (
          asset_id, intent_id, environment, owner_subject_id,
          subject_device_binding_id, purpose,
          owner_type, owner_id, storage_object_name, expected_generation,
          expected_sha256, expected_size_bytes, claimed_mime_type,
          consent_access_version
        ) values (
          ${ids.mediaAsset}, ${ids.mediaIntent}, 'demo', ${ids.farmerA},
          ${ids.farmerBindingA},
          'VOICE_OFFLINE_AUDIO', 'VOICE_SESSION', ${ids.mediaOwner},
          'quarantine/test-media-asset', 0, ${`sha256:${'c'.repeat(64)}`},
          128, 'audio/wav', 1
        )
      `;
      await transaction`
        update media.asset set
          state = 'UPLOADED_UNVERIFIED', revision = 1, actual_generation = 17,
          finalized_sha256 = ${`sha256:${'c'.repeat(64)}`}, finalized_size_bytes = 128
        where asset_id = ${ids.mediaAsset}
      `;
      await expect(
        transaction.savepoint(
          (savepoint) => savepoint`
            update media.asset set state = 'SCANNING', revision = 2
            where asset_id = ${ids.mediaAsset}
          `,
        ),
      ).rejects.toMatchObject({ code: '42501' });

      await transaction`select set_config('app.subject_device_binding_id', ${ids.farmerBindingB}, true)`;
      const wrongDeviceAssets = await transaction<{ asset_id: string }[]>`
        select asset_id::text from media.asset where asset_id = ${ids.mediaAsset}
      `;
      expect(wrongDeviceAssets).toEqual([]);
      await transaction`select set_config('app.subject_device_binding_id', ${ids.farmerBindingA}, true)`;

      await transaction.unsafe('reset role');
      await transaction.unsafe('set local role sf_media_scanner');
      await transaction`
        update media.asset set
          state = 'SCANNING', revision = 2,
          scan_claim_token = ${ids.mediaScanClaim}, scan_claimed_at = now()
        where asset_id = ${ids.mediaAsset}
      `;
      await expect(
        transaction.savepoint(
          (savepoint) => savepoint`
            update media.asset set
              state = 'VERIFIED', revision = 3,
              verified_sha256 = ${`sha256:${'c'.repeat(64)}`},
              verified_size_bytes = 128, verified_mime_type = 'audio/wav',
              verified_at = now()
            where asset_id = ${ids.mediaAsset}
          `,
        ),
      ).rejects.toMatchObject({ code: '42501' });
      await transaction`
        insert into media.scan_result (
          scan_result_id, asset_id, storage_event_id, scanner_build,
          object_generation, sha256, size_bytes, magic_mime_type,
          decoder_name, decoder_version, malware_engine,
          malware_signature_version, outcome
        ) values (
          ${ids.mediaScanResult}, ${ids.mediaAsset}, ${ids.mediaStorageEvent},
          'integration-test', 17, ${`sha256:${'c'.repeat(64)}`}, 128,
          'audio/wav', 'strict-audio-decoder', 'test-v1', 'test-malware',
          'test-signatures', 'VERIFIED'
        )
      `;
      await transaction`
        insert into media.derivative (
          derivative_id, asset_id, derivative_type, storage_object_name,
          object_generation, sha256, mime_type, size_bytes
        ) values (
          ${ids.mediaDerivative}, ${ids.mediaAsset}, 'SAFE_AUDIO',
          'protected/test-media-asset', 18, ${`sha256:${'d'.repeat(64)}`},
          'audio/wav', 120
        )
      `;
      await transaction`
        update media.asset set
          state = 'VERIFIED', revision = 3,
          verified_sha256 = ${`sha256:${'c'.repeat(64)}`},
          verified_size_bytes = 128, verified_mime_type = 'audio/wav',
          verified_at = now()
        where asset_id = ${ids.mediaAsset}
      `;
      const verified = await transaction<{ state: string; revision: number }[]>`
        select state, revision::int as revision from media.asset
        where asset_id = ${ids.mediaAsset}
      `;
      expect(verified).toEqual([{ state: 'VERIFIED', revision: 3 }]);
    });
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
        'platform'::regnamespace,
        'media'::regnamespace,
        'voice'::regnamespace
      ) and relkind = 'r' and relrowsecurity
    `;
    expect(rows[0]?.count).toBeGreaterThanOrEqual(49);
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
      await insertSyncStream(transaction, ids.syncStreamA, ids.farmerA, ids.farmerBindingA);
      await insertSyncStream(transaction, ids.syncStreamB, ids.farmerB, ids.farmerBindingB);
      await transaction.unsafe('set local role sf_farmer_api');
      await setFarmerContext(transaction, ids.farmerA, ids.farmerContextA);

      const visible = await transaction<{ event_id: string }[]>`
        select event_id::text from platform.domain_event order by event_id
      `;
      expect(visible).toEqual([{ event_id: ids.eventA }]);

      const visibleStreams = await transaction<{ stream_id: string }[]>`
        select stream_id::text from platform.sync_stream order by stream_id
      `;
      expect(visibleStreams).toEqual([{ stream_id: ids.syncStreamA }]);

      await transaction`select set_config('app.subject_device_binding_id', ${ids.farmerBindingB}, true)`;
      const wrongDeviceStreams = await transaction<{ stream_id: string }[]>`
        select stream_id::text from platform.sync_stream order by stream_id
      `;
      expect(wrongDeviceStreams).toEqual([]);

      await expect(
        transaction.savepoint((savepoint) =>
          insertDomainEvent(savepoint, ids.correlation, ids.farmerB),
        ),
      ).rejects.toMatchObject({ code: '42501' });
    });
  });

  it('issues context-bound grants with least-privilege row locking and preserves isolation', async () => {
    await rollbackAfter(sql, async (transaction) => {
      await seedAuthority(transaction);
      const privileges = await transaction<{ direct_insert: boolean; event_insert: boolean }[]>`
        select
          has_table_privilege('sf_rsk_api', 'consent.access_grant', 'INSERT') as direct_insert,
          has_table_privilege('sf_rsk_api', 'consent.access_grant_event', 'INSERT') as event_insert
      `;
      expect(privileges).toEqual([{ direct_insert: false, event_insert: false }]);

      const rowLockPrivileges = await transaction<
        {
          broad_update: boolean;
          definer_column_update: boolean;
          runtime_column_update: boolean;
          update_columns: string[];
        }[]
      >`
        select
          has_table_privilege(
            'sf_migrator', 'identity.assisted_context', 'UPDATE'
          ) as broad_update,
          has_any_column_privilege(
            'sf_migrator', 'identity.assisted_context', 'UPDATE'
          ) as definer_column_update,
          has_any_column_privilege(
            'sf_rsk_api', 'identity.assisted_context', 'UPDATE'
          ) as runtime_column_update,
          coalesce((
            select array_agg(column_name order by column_name)
            from information_schema.column_privileges
            where grantee = 'sf_migrator'
              and table_schema = 'identity'
              and table_name = 'assisted_context'
              and privilege_type = 'UPDATE'
          ), array[]::text[]) as update_columns
      `;
      expect(rowLockPrivileges).toEqual([
        {
          broad_update: false,
          definer_column_update: true,
          runtime_column_update: false,
          update_columns: ['updated_at'],
        },
      ]);

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
      await transaction.unsafe(
        'revoke update (updated_at) on identity.assisted_context from sf_migrator',
      );
      await transaction.unsafe('set local role sf_rsk_api');
      await setRskContext(transaction, ids.rskA, ids.rskContextA, ids.officeA, ids.jurisdictionA);
      await expect(
        transaction.savepoint(
          (savepoint) => savepoint`
            select consent.issue_access_grant(
              ${ids.rowLockProbeGrant}::uuid,
              ${ids.farmerA}::uuid,
              ${ids.target}::uuid,
              1,
              now() + interval '10 minutes',
              ${ids.correlation}::uuid
            )
          `,
        ),
      ).rejects.toMatchObject({
        code: '42501',
        message: 'permission denied for table assisted_context',
      });

      await transaction.unsafe('reset role');
      await transaction.unsafe(
        'grant update (updated_at) on identity.assisted_context to sf_migrator',
      );
      await transaction.unsafe('set local role sf_rsk_api');
      await setRskContext(transaction, ids.rskA, ids.rskContextA, ids.officeA, ids.jurisdictionA);
      await expect(
        transaction.savepoint(
          (savepoint) => savepoint`
            select consent.issue_access_grant(
              ${ids.staleConsentGrant}::uuid,
              ${ids.farmerA}::uuid,
              ${ids.target}::uuid,
              2,
              now() + interval '10 minutes',
              ${ids.correlation}::uuid
            )
          `,
        ),
      ).rejects.toMatchObject({ code: '42501', message: 'access grant denied' });

      await transaction.unsafe('reset role');
      await transaction.unsafe('set local role sf_rsk_api');
      await setRskContext(transaction, ids.rskB, ids.rskContextB, ids.officeB, ids.jurisdictionB);
      await expect(
        transaction.savepoint(
          (savepoint) => savepoint`
            select consent.issue_access_grant(
              ${ids.crossOfficeGrant}::uuid,
              ${ids.farmerA}::uuid,
              ${ids.target}::uuid,
              1,
              now() + interval '10 minutes',
              ${ids.correlation}::uuid
            )
          `,
        ),
      ).rejects.toMatchObject({ code: '42501', message: 'access grant denied' });

      const crossOffice = await transaction<{ contexts: number; grants: number }[]>`
        select
          (select count(*)::int from identity.assisted_context) as contexts,
          (select count(*)::int from consent.access_grant) as grants
      `;
      expect(crossOffice).toEqual([{ contexts: 0, grants: 0 }]);

      await transaction.unsafe('reset role');
      const deniedSideEffects = await transaction<{ count: number }[]>`
        select count(*)::int as count
        from consent.access_grant
        where access_grant_id in (
          ${ids.rowLockProbeGrant}::uuid,
          ${ids.staleConsentGrant}::uuid,
          ${ids.crossOfficeGrant}::uuid
        )
      `;
      expect(deniedSideEffects).toEqual([{ count: 0 }]);
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
    insert into identity.subject_device_binding (
      subject_device_binding_id, subject_id, installation_id, app_id,
      environment, state, device_mode, last_verified_at
    ) values
      (${ids.farmerBindingA}, ${ids.farmerA}, ${ids.farmerBindingA},
       'farmer-web', 'demo', 'ACTIVE', 'PERSONAL', now()),
      (${ids.farmerBindingB}, ${ids.farmerB}, ${ids.farmerBindingB},
       'farmer-web', 'demo', 'ACTIVE', 'PERSONAL', now())
    on conflict (subject_device_binding_id) do nothing
  `;
  await transaction`
    insert into consent.policy_version (
      policy_version_id, scope_key, purpose_key, version, locale,
      notice_digest, effective_at
    ) values
      (
        ${ids.policy}, 'assisted_service.access', 'assisted.service', 1, 'en',
        ${'b'.repeat(64)}, now() - interval '1 day'
      ),
      (
        ${ids.audioPolicy}, 'audio.storage', 'farmer.self_service', 1, 'en',
        ${'c'.repeat(64)}, now() - interval '1 day'
      )
    on conflict (policy_version_id) do nothing
  `;
  await transaction`
    insert into consent.decision (
      consent_decision_id, subject_id, scope_key, purpose_key, target_kind, target_id,
      decision, policy_version_id, access_version, expires_at, actor_subject_id,
      correlation_id
    ) values
      (
        ${ids.decision}, ${ids.farmerA}, 'assisted_service.access', 'assisted.service',
        'ASSISTED_FARMER_CONTEXT', ${ids.target}, 'ALLOW', ${ids.policy}, 1,
        now() + interval '45 minutes', ${ids.farmerA}, ${ids.correlation}
      ),
      (
        ${ids.audioDecision}, ${ids.farmerA}, 'audio.storage', 'farmer.self_service',
        'ACCOUNT', ${ids.farmerA}, 'ALLOW', ${ids.audioPolicy}, 1,
        now() + interval '45 minutes', ${ids.farmerA}, ${ids.correlation}
      )
    on conflict (consent_decision_id) do nothing
  `;
  await transaction`
    insert into consent.current_state (
      subject_id, scope_key, purpose_key, target_kind, target_id, consent_decision_id,
      state, access_version, expires_at
    ) values
      (
        ${ids.farmerA}, 'assisted_service.access', 'assisted.service',
        'ASSISTED_FARMER_CONTEXT', ${ids.target}, ${ids.decision}, 'ALLOWED', 1,
        now() + interval '45 minutes'
      ),
      (
        ${ids.farmerA}, 'audio.storage', 'farmer.self_service',
        'ACCOUNT', ${ids.farmerA}, ${ids.audioDecision}, 'ALLOWED', 1,
        now() + interval '45 minutes'
      )
    on conflict (subject_id, scope_key, purpose_key, target_kind, target_id) do nothing
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
    subjectDeviceBindingId: subjectId === ids.farmerA ? ids.farmerBindingA : ids.farmerBindingB,
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
    subjectDeviceBindingId: '00000000-0000-0000-0000-000000000000',
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
    subjectDeviceBindingId: string;
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
    ['app.subject_device_binding_id', context.subjectDeviceBindingId],
  ] as const;
  for (const [name, value] of settings) {
    await transaction`select set_config(${name}, ${value}, true)`;
  }
}

async function insertSyncStream(
  transaction: Transaction,
  streamId: string,
  subjectId: string,
  subjectDeviceBindingId: string,
): Promise<void> {
  await transaction`
    insert into platform.sync_stream (
      stream_id, environment, subject_id, subject_device_binding_id,
      authorization_version, device_mode, client_build,
      local_database_schema_version, command_version, client_event_version,
      projection_version, media_version, cursor, high_water_mark, expires_at
    ) values (
      ${streamId}, 'demo', ${subjectId}, ${subjectDeviceBindingId},
      1, 'PERSONAL', 'integration-test', 1, 1, 1, 1, 1,
      'cursor-0', 'cursor-0', now() + interval '15 minutes'
    )
  `;
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
