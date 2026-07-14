import { createFarmerClient } from '@smart-fasal/contracts/clients/farmer';
import type {
  AdvisoryResponseReceipt,
  AdvisoryResponseRequest,
  AdvisoryResultResponse,
  FarmerTodayResponse,
  RecommendationAcceptanceRequest,
  RecommendationAcceptanceResponse,
  RecommendationReadinessResponse,
  RecommendationRequest,
  RecommendationResultResponse,
  RecommendationReviewRequest,
  RecommendationRunAcceptedResponse,
  RecommendationRunStatusResponse,
  SeasonCalendarResponse,
  SeasonStartConfirmationRequest,
} from '@smart-fasal/contracts/schemas';

import type { InMemoryCredentials } from '../auth/auth-memory';

export type ShellIssue = 'unauthenticated' | 'denied' | 'expired' | 'withdrawn' | 'unavailable';
export type RoleEstablishment =
  ShellIssue | { readonly kind: 'ready'; readonly roleContextId: string };

export type FarmerShellState =
  | { readonly kind: ShellIssue }
  | {
      readonly kind: 'ready';
      readonly subjectId: string;
      readonly role: 'FARMER';
      readonly environment: string;
      readonly authorizationVersion: number;
      readonly onboardingState: string;
      readonly farmContextState: 'UNAVAILABLE_UNTIL_SETUP' | 'AVAILABLE';
      readonly firstFarmId?: string;
      readonly firstPlotId?: string;
      readonly evidenceSummary?: FarmerEvidenceSummary;
      readonly today?: FarmerTodayResponse;
    };

export interface FarmerEvidenceSummary {
  readonly plotId: string;
  readonly generatedAt: string;
  readonly cards: readonly {
    readonly cardId: string;
    readonly title: string;
    readonly status: string;
    readonly primary?: {
      readonly metricKey: string;
      readonly dataMode: 'LIVE' | 'RECORDED' | 'SIMULATED';
      readonly quality: string;
      readonly freshness: string;
      readonly source: { readonly sourceName: string };
      readonly value: {
        readonly state: string;
        readonly normalizedValue?: string;
        readonly normalizedUnit: string;
      };
      readonly limitations: readonly string[];
    };
  }[];
}

interface ApiOptions {
  readonly baseUrl?: string;
  readonly revokeCommandId?: string;
  readonly roleContextId?: string;
  readonly roleCommand?: {
    readonly commandId: string;
    readonly recordedAt: string;
    readonly timezone: string;
  };
  readonly signal?: AbortSignal;
}

const CLIENT_BUILD = process.env.NEXT_PUBLIC_CLIENT_BUILD ?? 'farmer-web-local';
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

function baseUrl(override?: string): string {
  const configured = override ?? process.env.NEXT_PUBLIC_DOMAIN_API_ORIGIN;
  if (!configured) throw new Error('DOMAIN_API_UNAVAILABLE');
  return configured;
}

function authenticatedClient(
  credentials: InMemoryCredentials,
  override?: string,
  roleContextId?: string,
) {
  return createFarmerClient({
    baseUrl: baseUrl(override),
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
  if (code === 'AUTHORIZATION_VERSION_CHANGED' || code === 'SOURCE_VERSION_EXPIRED') {
    return 'expired';
  }
  if (code === 'CONSENT_OR_ACCESS_VERSION_CHANGED') return 'withdrawn';
  if (code === 'DEPENDENCY_UNAVAILABLE') return 'unavailable';
  return 'denied';
}

export async function createFarmerReturnState(
  appCheckToken: string,
  installationId: string,
  options: ApiOptions = {},
): Promise<string> {
  const client = createFarmerClient({
    baseUrl: baseUrl(options.baseUrl),
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
    body: { routeKey: 'FARMER_HOME' },
    params: { header: requiredHeaders(installationId) },
    signal: options.signal,
  });
  if (!data || error) {
    throw new Error(error?.code ?? `RETURN_STATE_${response.status}`);
  }
  return data.returnStateId;
}

export async function establishFarmerRole(
  credentials: InMemoryCredentials,
  installationId: string,
  options: ApiOptions = {},
): Promise<RoleEstablishment> {
  try {
    const client = authenticatedClient(credentials, options.baseUrl);
    const rolesResult = await client.GET('/v1/auth/roles', {
      params: { header: requiredHeaders(installationId) },
      signal: options.signal,
    });
    if (!rolesResult.data || rolesResult.error) {
      return problemToShellIssue(rolesResult.error?.code, rolesResult.response.status);
    }
    const session = rolesResult.data;
    if (session.activeRoleContext?.roleType === 'FARMER') {
      return { kind: 'ready', roleContextId: session.activeRoleContext.roleContextId };
    }

    const roles = session.roles as unknown as readonly {
      readonly roleGrantId: string;
      readonly roleType: 'FARMER' | 'RSK' | 'MP';
    }[];
    const role = roles.find((candidate) => candidate.roleType === 'FARMER');
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
        payload: { roleGrantId: role.roleGrantId },
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
    if (!result.data || result.error) {
      return problemToShellIssue(result.error?.code, result.response.status);
    }
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

export async function loadFarmerShell(
  credentials: InMemoryCredentials,
  installationId: string,
  options: ApiOptions = {},
): Promise<FarmerShellState> {
  try {
    if (options.roleContextId === undefined) return { kind: 'denied' };
    const headers = protectedHeaders(installationId, options.roleContextId);
    const client = authenticatedClient(credentials, options.baseUrl, options.roleContextId);
    const sessionResult = await client.GET('/v1/auth/session', {
      params: { header: headers },
      signal: options.signal,
    });
    if (!sessionResult.data || sessionResult.error) {
      return {
        kind: problemToShellIssue(sessionResult.error?.code, sessionResult.response.status),
      };
    }
    const session = sessionResult.data;
    const context = session.activeRoleContext;
    if (!context) return { kind: 'expired' };
    if (context.roleType !== 'FARMER') return { kind: 'denied' };
    if (session.mfaState === 'EXPIRED') return { kind: 'expired' };
    if (session.deviceBindingState !== 'ACTIVE') return { kind: 'denied' };

    const bootstrapResult = await client.GET('/v1/farmer/bootstrap', {
      params: { header: headers },
      signal: options.signal,
    });
    if (!bootstrapResult.data || bootstrapResult.error) {
      return {
        kind: problemToShellIssue(bootstrapResult.error?.code, bootstrapResult.response.status),
      };
    }
    const bootstrap = bootstrapResult.data;
    if (bootstrap.authorizationVersion !== context.authorizationVersion) return { kind: 'expired' };
    const myFarm = bootstrap.myFarm as
      | {
          farms?: readonly {
            farmId?: string;
            plots?: readonly { plotId?: string }[];
          }[];
        }
      | undefined;
    const firstPlotId = myFarm?.farms?.[0]?.plots?.[0]?.plotId;
    let evidenceSummary: FarmerEvidenceSummary | undefined;
    if (firstPlotId !== undefined) {
      const evidenceResult = await client.GET('/v1/farmer/plots/{plotId}/evidence-summary', {
        params: { header: headers, path: { plotId: firstPlotId } },
        signal: options.signal,
      });
      if (evidenceResult.data && !evidenceResult.error) {
        evidenceSummary = evidenceResult.data as unknown as FarmerEvidenceSummary;
      }
    }
    let today: FarmerTodayResponse | undefined;
    try {
      const todayResult = await client.GET('/v1/farmer/today', {
        params: { header: headers },
        signal: options.signal,
      });
      today =
        todayResult.data && !todayResult.error
          ? (todayResult.data as unknown as FarmerTodayResponse)
          : undefined;
    } catch {
      today = undefined;
    }

    return {
      kind: 'ready',
      subjectId: session.subjectId,
      role: 'FARMER',
      environment: session.environment,
      authorizationVersion: context.authorizationVersion,
      onboardingState: bootstrap.onboardingState,
      farmContextState: bootstrap.farmContextState,
      ...(myFarm?.farms?.[0]?.farmId === undefined ? {} : { firstFarmId: myFarm.farms[0].farmId }),
      ...(firstPlotId === undefined ? {} : { firstPlotId }),
      ...(evidenceSummary === undefined ? {} : { evidenceSummary }),
      ...(today === undefined ? {} : { today }),
    };
  } catch (error) {
    if (options.signal?.aborted) throw error;
    return { kind: 'unavailable' };
  }
}

export async function revokeFarmerRoleContext(
  credentials: InMemoryCredentials,
  installationId: string,
  roleContextId: string,
  options: ApiOptions = {},
): Promise<boolean> {
  try {
    const commandId = options.revokeCommandId ?? globalThis.crypto.randomUUID();
    const client = authenticatedClient(credentials, options.baseUrl, roleContextId);
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

function etagRevision(revision: number): string {
  return `"rev:${revision}"`;
}

function failRecommendationRequest(errorCode: string | undefined, status: number): never {
  throw new Error(errorCode ?? `RECOMMENDATION_REQUEST_${status}`);
}

export async function loadFarmerToday(
  credentials: InMemoryCredentials,
  installationId: string,
  roleContextId: string,
  options: ApiOptions = {},
): Promise<FarmerTodayResponse> {
  const client = authenticatedClient(credentials, options.baseUrl, roleContextId);
  const result = await client.GET('/v1/farmer/today', {
    params: { header: protectedHeaders(installationId, roleContextId) },
    signal: options.signal,
  });
  if (!result.data || result.error) {
    failRecommendationRequest(result.error?.code, result.response.status);
  }
  return result.data as unknown as FarmerTodayResponse;
}

export async function loadFarmerAdvisory(
  credentials: InMemoryCredentials,
  installationId: string,
  roleContextId: string,
  advisoryId: string,
  options: ApiOptions = {},
): Promise<AdvisoryResultResponse> {
  const client = authenticatedClient(credentials, options.baseUrl, roleContextId);
  const result = await client.GET('/v1/farmer/advisories/{advisoryId}', {
    params: {
      header: protectedHeaders(installationId, roleContextId),
      path: { advisoryId },
    },
    signal: options.signal,
  });
  if (!result.data || result.error) {
    failRecommendationRequest(result.error?.code, result.response.status);
  }
  return result.data as unknown as AdvisoryResultResponse;
}

export async function respondToFarmerAdvisory(
  credentials: InMemoryCredentials,
  installationId: string,
  roleContextId: string,
  advisoryId: string,
  request: AdvisoryResponseRequest,
  options: ApiOptions = {},
): Promise<AdvisoryResponseReceipt> {
  const client = authenticatedClient(credentials, options.baseUrl, roleContextId);
  const result = await client.POST('/v1/farmer/advisories/{advisoryId}/responses', {
    body: request,
    params: {
      header: {
        ...protectedHeaders(installationId, roleContextId),
        'Idempotency-Key': request.commandId,
        'If-Match': etagRevision(request.expectedRevision),
      },
      path: { advisoryId },
    },
    signal: options.signal,
  });
  if (!result.data || result.error) {
    failRecommendationRequest(result.error?.code, result.response.status);
  }
  return result.data as unknown as AdvisoryResponseReceipt;
}

export async function loadRecommendationReadiness(
  credentials: InMemoryCredentials,
  installationId: string,
  roleContextId: string,
  plotId: string,
  options: ApiOptions = {},
): Promise<RecommendationReadinessResponse> {
  const client = authenticatedClient(credentials, options.baseUrl, roleContextId);
  const result = await client.GET('/v1/farmer/plots/{plotId}/recommendation-readiness', {
    params: {
      header: protectedHeaders(installationId, roleContextId),
      path: { plotId },
    },
    signal: options.signal,
  });
  if (!result.data || result.error) {
    failRecommendationRequest(result.error?.code, result.response.status);
  }
  return result.data as unknown as RecommendationReadinessResponse;
}

export async function createRecommendationRun(
  credentials: InMemoryCredentials,
  installationId: string,
  roleContextId: string,
  plotId: string,
  request: RecommendationRequest,
  options: ApiOptions & { readonly commandId?: string } = {},
): Promise<RecommendationRunAcceptedResponse> {
  const commandId = options.commandId ?? globalThis.crypto.randomUUID();
  const client = authenticatedClient(credentials, options.baseUrl, roleContextId);
  const result = await client.POST('/v1/farmer/plots/{plotId}/recommendation-runs', {
    body: request,
    params: {
      header: {
        ...protectedHeaders(installationId, roleContextId),
        'Idempotency-Key': commandId,
        'If-Match': etagRevision(request.planningContextRevision),
      },
      path: { plotId },
    },
    signal: options.signal,
  });
  if (!result.data || result.error) {
    failRecommendationRequest(result.error?.code, result.response.status);
  }
  return result.data as unknown as RecommendationRunAcceptedResponse;
}

export async function loadRecommendationRun(
  credentials: InMemoryCredentials,
  installationId: string,
  roleContextId: string,
  operationId: string,
  options: ApiOptions = {},
): Promise<RecommendationRunStatusResponse> {
  const client = authenticatedClient(credentials, options.baseUrl, roleContextId);
  const result = await client.GET('/v1/farmer/recommendation-runs/{operationId}', {
    params: {
      header: protectedHeaders(installationId, roleContextId),
      path: { operationId },
    },
    signal: options.signal,
  });
  if (!result.data || result.error) {
    failRecommendationRequest(result.error?.code, result.response.status);
  }
  return result.data as unknown as RecommendationRunStatusResponse;
}

export async function loadRecommendationResult(
  credentials: InMemoryCredentials,
  installationId: string,
  roleContextId: string,
  recommendationId: string,
  options: ApiOptions = {},
): Promise<RecommendationResultResponse> {
  const client = authenticatedClient(credentials, options.baseUrl, roleContextId);
  const result = await client.GET('/v1/farmer/recommendations/{recommendationId}', {
    params: {
      header: protectedHeaders(installationId, roleContextId),
      path: { recommendationId },
    },
    signal: options.signal,
  });
  if (!result.data || result.error) {
    failRecommendationRequest(result.error?.code, result.response.status);
  }
  return result.data as unknown as RecommendationResultResponse;
}

export async function requestRecommendationReview(
  credentials: InMemoryCredentials,
  installationId: string,
  roleContextId: string,
  recommendationId: string,
  request: RecommendationReviewRequest,
  options: ApiOptions = {},
): Promise<boolean> {
  const client = authenticatedClient(credentials, options.baseUrl, roleContextId);
  const result = await client.POST(
    '/v1/farmer/recommendations/{recommendationId}/review-requests',
    {
      body: request,
      params: {
        header: {
          ...protectedHeaders(installationId, roleContextId),
          'Idempotency-Key': request.commandId,
          'If-Match': etagRevision(request.expectedRevision),
        },
        path: { recommendationId },
      },
      signal: options.signal,
    },
  );
  if (!result.data || result.error) {
    failRecommendationRequest(result.error?.code, result.response.status);
  }
  return ['ACCEPTED', 'ALREADY_ACCEPTED'].includes(result.data.disposition);
}

export async function acceptRecommendation(
  credentials: InMemoryCredentials,
  installationId: string,
  roleContextId: string,
  recommendationId: string,
  request: RecommendationAcceptanceRequest,
  options: ApiOptions = {},
): Promise<RecommendationAcceptanceResponse> {
  const client = authenticatedClient(credentials, options.baseUrl, roleContextId);
  const result = await client.POST('/v1/farmer/recommendations/{recommendationId}/acceptances', {
    body: request,
    params: {
      header: {
        ...protectedHeaders(installationId, roleContextId),
        'Idempotency-Key': request.commandId,
        'If-Match': etagRevision(request.expectedRevision),
      },
      path: { recommendationId },
    },
    signal: options.signal,
  });
  if (!result.data || result.error) {
    failRecommendationRequest(result.error?.code, result.response.status);
  }
  return result.data as unknown as RecommendationAcceptanceResponse;
}

export async function confirmSeasonStart(
  credentials: InMemoryCredentials,
  installationId: string,
  roleContextId: string,
  seasonId: string,
  request: SeasonStartConfirmationRequest,
  options: ApiOptions = {},
): Promise<boolean> {
  const client = authenticatedClient(credentials, options.baseUrl, roleContextId);
  const result = await client.POST('/v1/farmer/seasons/{seasonId}/start-confirmations', {
    body: request,
    params: {
      header: {
        ...protectedHeaders(installationId, roleContextId),
        'Idempotency-Key': request.commandId,
        'If-Match': etagRevision(request.expectedRevision),
      },
      path: { seasonId },
    },
    signal: options.signal,
  });
  if (!result.data || result.error) {
    failRecommendationRequest(result.error?.code, result.response.status);
  }
  return ['ACCEPTED', 'ALREADY_ACCEPTED'].includes(result.data.disposition);
}

export async function loadSeasonCalendar(
  credentials: InMemoryCredentials,
  installationId: string,
  roleContextId: string,
  seasonId: string,
  options: ApiOptions = {},
): Promise<SeasonCalendarResponse> {
  const client = authenticatedClient(credentials, options.baseUrl, roleContextId);
  const result = await client.GET('/v1/farmer/seasons/{seasonId}/calendar', {
    params: {
      header: protectedHeaders(installationId, roleContextId),
      path: { seasonId },
    },
    signal: options.signal,
  });
  if (!result.data || result.error) {
    failRecommendationRequest(result.error?.code, result.response.status);
  }
  return result.data as unknown as SeasonCalendarResponse;
}
