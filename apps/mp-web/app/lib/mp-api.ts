import { createMpClient } from '@smart-fasal/contracts/clients/mp';

import type { InMemoryCredentials } from '../auth/auth-memory';

export type ShellIssue = 'unauthenticated' | 'denied' | 'expired' | 'withdrawn' | 'unavailable';
export type RoleEstablishment =
  ShellIssue | { readonly kind: 'ready'; readonly roleContextId: string };

export type MpShellState =
  | { readonly kind: ShellIssue }
  | {
      readonly kind: 'ready';
      readonly subjectId: string;
      readonly role: 'MP';
      readonly environment: string;
      readonly authorizationVersion: number;
      readonly jurisdictionId?: string;
      readonly releaseState: 'DEPENDENCY_UNAVAILABLE';
    };

interface ApiOptions {
  readonly baseUrl?: string;
  readonly authBaseUrl?: string;
  readonly queryBaseUrl?: string;
  readonly revokeCommandId?: string;
  readonly roleContextId?: string;
  readonly roleCommand?: {
    readonly commandId: string;
    readonly recordedAt: string;
    readonly timezone: string;
  };
  readonly signal?: AbortSignal;
}
const CLIENT_BUILD = process.env.NEXT_PUBLIC_CLIENT_BUILD ?? 'mp-web-local';
const SCHEMA_VERSION = '1';

function requiredHeaders(installationId: string) {
  return {
    'X-Client-Build': CLIENT_BUILD,
    'X-Client-Installation-Id': installationId,
    'X-Client-Schema-Version': SCHEMA_VERSION,
  } as const;
}

function protectedHeaders(installationId: string, roleContextId: string) {
  return {
    ...requiredHeaders(installationId),
    'X-Role-Context-Id': roleContextId,
  } as const;
}

function authBaseUrl(options: ApiOptions): string {
  const configured =
    options.authBaseUrl ?? options.baseUrl ?? process.env.NEXT_PUBLIC_DOMAIN_API_ORIGIN;
  if (!configured) throw new Error('DOMAIN_API_UNAVAILABLE');
  return configured;
}

function queryBaseUrl(options: ApiOptions): string {
  const configured =
    options.queryBaseUrl ?? options.baseUrl ?? process.env.NEXT_PUBLIC_MP_QUERY_API_ORIGIN;
  if (!configured) throw new Error('MP_QUERY_API_UNAVAILABLE');
  return configured;
}

function authenticatedClient(
  credentials: InMemoryCredentials,
  baseUrl: string,
  roleContextId?: string,
) {
  return createMpClient({
    baseUrl,
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      Authorization: `Bearer ${credentials.idToken}`,
      'X-Firebase-AppCheck': credentials.appCheckToken,
      'X-Client-Schema-Version': SCHEMA_VERSION,
      ...(roleContextId === undefined ? {} : { 'X-Role-Context-Id': roleContextId }),
    },
    redirect: 'error',
    referrerPolicy: 'no-referrer',
  });
}

export function problemToShellIssue(code: string | undefined, status: number): ShellIssue {
  if (status === 401 || code === 'AUTHENTICATION_REQUIRED') return 'unauthenticated';
  if (code === 'AUTHORIZATION_VERSION_CHANGED' || code === 'SOURCE_VERSION_EXPIRED')
    return 'expired';
  if (code === 'CONSENT_OR_ACCESS_VERSION_CHANGED') return 'withdrawn';
  if (code === 'DEPENDENCY_UNAVAILABLE') return 'unavailable';
  return 'denied';
}

export async function createMpReturnState(
  appCheckToken: string,
  installationId: string,
  options: ApiOptions = {},
): Promise<string> {
  const client = createMpClient({
    baseUrl: authBaseUrl(options),
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      'X-Firebase-AppCheck': appCheckToken,
      'X-Client-Schema-Version': SCHEMA_VERSION,
    },
    redirect: 'error',
    referrerPolicy: 'no-referrer',
  });
  const { data, error, response } = await client.POST('/v1/auth/return-states', {
    body: { routeKey: 'MP_HOME' },
    params: { header: requiredHeaders(installationId) },
    signal: options.signal,
  });
  if (!data || error) throw new Error(error?.code ?? `RETURN_STATE_${response.status}`);
  return data.returnStateId;
}

export async function establishMpRole(
  credentials: InMemoryCredentials,
  installationId: string,
  options: ApiOptions = {},
): Promise<RoleEstablishment> {
  try {
    const client = authenticatedClient(credentials, authBaseUrl(options));
    const rolesResult = await client.GET('/v1/auth/roles', {
      params: { header: requiredHeaders(installationId) },
      signal: options.signal,
    });
    if (!rolesResult.data || rolesResult.error)
      return problemToShellIssue(rolesResult.error?.code, rolesResult.response.status);
    const session = rolesResult.data;
    if (session.mfaState === 'EXPIRED') return 'expired';
    if (session.mfaState !== 'CURRENT') return 'denied';
    if (session.activeRoleContext?.roleType === 'MP') {
      return { kind: 'ready', roleContextId: session.activeRoleContext.roleContextId };
    }
    const roles = session.roles as unknown as readonly {
      readonly roleGrantId: string;
      readonly roleType: 'FARMER' | 'RSK' | 'MP';
      readonly officeId?: string;
      readonly jurisdictionId?: string;
    }[];
    const role = roles.find((candidate) => candidate.roleType === 'MP');
    if (!role) return 'denied';
    const commandId = options.roleCommand?.commandId ?? globalThis.crypto.randomUUID();
    const recordedAt = options.roleCommand?.recordedAt ?? new Date().toISOString();
    const timezone =
      options.roleCommand?.timezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone ??
      'Asia/Kolkata';
    const result = await client.POST('/v1/auth/role-contexts', {
      body: {
        clientContext: {
          clientRecordedAt: recordedAt,
          dataModeClaim: 'LIVE',
          timezone,
        },
        commandSchemaVersion: 1,
        expectedRevision: 0,
        operation: 'SelectRoleContext',
        payload: {
          roleGrantId: role.roleGrantId,
          ...(role.officeId ? { officeId: role.officeId } : {}),
          ...(role.jurisdictionId ? { jurisdictionId: role.jurisdictionId } : {}),
        },
        target: { id: commandId, type: 'roleContext' },
      },
      params: {
        header: {
          ...requiredHeaders(installationId),
          'Idempotency-Key': commandId,
          'X-Client-Schema-Version': SCHEMA_VERSION,
        },
      },
      signal: options.signal,
    });
    if (!result.data || result.error)
      return problemToShellIssue(result.error?.code, result.response.status);
    if (
      !['ACCEPTED', 'ALREADY_ACCEPTED'].includes(result.data.disposition) ||
      result.data.result?.type !== 'roleContext'
    ) {
      return 'denied';
    }
    return { kind: 'ready', roleContextId: result.data.result.id };
  } catch {
    return 'unavailable';
  }
}

export async function loadMpShell(
  credentials: InMemoryCredentials,
  installationId: string,
  options: ApiOptions = {},
): Promise<MpShellState> {
  try {
    if (options.roleContextId === undefined) return { kind: 'denied' };
    const headers = protectedHeaders(installationId, options.roleContextId);
    const authClient = authenticatedClient(
      credentials,
      authBaseUrl(options),
      options.roleContextId,
    );
    const sessionResult = await authClient.GET('/v1/auth/session', {
      params: { header: headers },
      signal: options.signal,
    });
    if (!sessionResult.data || sessionResult.error)
      return {
        kind: problemToShellIssue(sessionResult.error?.code, sessionResult.response.status),
      };
    const session = sessionResult.data;
    const context = session.activeRoleContext;
    if (!context) return { kind: 'expired' };
    if (context.roleType !== 'MP') return { kind: 'denied' };
    if (session.mfaState === 'EXPIRED') return { kind: 'expired' };
    if (session.mfaState !== 'CURRENT' || session.deviceBindingState !== 'ACTIVE')
      return { kind: 'denied' };

    const queryClient = authenticatedClient(
      credentials,
      queryBaseUrl(options),
      options.roleContextId,
    );
    const queryResult = await queryClient.GET('/v1/mp/query-context', {
      params: { header: headers },
      signal: options.signal,
    });
    if (!queryResult.data || queryResult.error)
      return { kind: problemToShellIssue(queryResult.error?.code, queryResult.response.status) };
    if (
      queryResult.data.code !== 'DEPENDENCY_UNAVAILABLE' ||
      queryResult.data.availableMetricKeys.length !== 0
    )
      return { kind: 'denied' };

    return {
      kind: 'ready',
      subjectId: session.subjectId,
      role: 'MP',
      environment: session.environment,
      authorizationVersion: context.authorizationVersion,
      ...(context.jurisdictionId ? { jurisdictionId: context.jurisdictionId } : {}),
      releaseState: queryResult.data.code,
    };
  } catch (error) {
    if (options.signal?.aborted) throw error;
    return { kind: 'unavailable' };
  }
}

export async function revokeMpRoleContext(
  credentials: InMemoryCredentials,
  installationId: string,
  roleContextId: string,
  options: ApiOptions = {},
): Promise<boolean> {
  try {
    const commandId = options.revokeCommandId ?? globalThis.crypto.randomUUID();
    const client = authenticatedClient(credentials, authBaseUrl(options), roleContextId);
    const { data, error } = await client.DELETE('/v1/auth/role-contexts/{roleContextId}', {
      params: {
        header: {
          ...requiredHeaders(installationId),
          'Idempotency-Key': commandId,
        },
        path: { roleContextId },
      },
      signal: options.signal,
    });
    return (
      data !== undefined &&
      error === undefined &&
      ['ACCEPTED', 'ALREADY_ACCEPTED'].includes(data.disposition)
    );
  } catch {
    return false;
  }
}
