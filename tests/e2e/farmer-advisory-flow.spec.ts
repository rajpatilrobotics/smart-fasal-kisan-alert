import { expect, test, type Page, type Route } from '@playwright/test';

import { E2E_APP_ORIGINS, E2E_DOMAIN_API_ORIGIN, E2E_IDENTITY_BRIDGE_READY_EVENT } from './origins';

const SUBJECT_ID = '00000000-0000-4000-8000-123456789abc';
const ROLE_CONTEXT_ID = '00000000-0000-4000-8000-000000000201';
const ROLE_GRANT_ID = '00000000-0000-4000-8000-000000000301';
const FARM_ID = '00000000-0000-4000-8000-000000000401';
const PLOT_ID = '00000000-0000-4000-8000-000000000402';
const ADVISORY_ID = '00000000-0000-4000-8000-000000000501';
const ALERT_ID = '00000000-0000-4000-8000-000000000502';
const EVIDENCE_ID = '00000000-0000-4000-8000-000000000601';
const SYNTHETIC_ID_TOKEN = 'synthetic-id-token-memory-only';
const SYNTHETIC_APP_CHECK_TOKEN = 'synthetic-app-check-memory-only';
const SERVER_TIME = '2030-01-01T00:00:00.000Z';

interface ObservedCall {
  readonly body?: unknown;
  readonly idempotencyKey?: string;
  readonly ifMatch?: string;
  readonly method: string;
  readonly path: string;
  readonly roleContextId?: string;
}

function sessionResponse(includeActiveContext: boolean) {
  const activeRoleContext = {
    authorizationVersion: 7,
    capabilities: ['farmer.today.read', 'farmer.advisory.read', 'farmer.advisory.respond'],
    capabilitySetVersion: 1,
    environment: 'demo',
    purposeCode: 'farmer.self_service',
    roleContextId: ROLE_CONTEXT_ID,
    roleType: 'FARMER',
    subjectId: SUBJECT_ID,
  };
  return {
    authorizationVersion: 7,
    capabilitySetVersion: 1,
    deviceBindingState: 'ACTIVE',
    environment: 'demo',
    mfaState: 'NOT_REQUIRED',
    roles: [
      {
        capabilitySetVersion: 1,
        destination: '/farmer/today',
        roleGrantId: ROLE_GRANT_ID,
        roleType: 'FARMER',
      },
    ],
    subjectId: SUBJECT_ID,
    subjectType: 'FARMER',
    ...(includeActiveContext ? { activeRoleContext } : {}),
  };
}

function todayResponse(syncState: 'SYNCED' | 'OFFLINE_CACHE' = 'OFFLINE_CACHE') {
  return {
    generatedAt: '2026-07-14T09:30:00.000Z',
    locale: 'mr-IN',
    dataMode: 'RECORDED',
    syncState,
    cards: [
      {
        advisoryId: ADVISORY_ID,
        plotId: PLOT_ID,
        kind: 'IRRIGATION_NEEDED',
        lifecycleState: 'ACTIVE',
        severity: 'ACTION',
        urgency: 'TODAY',
        generatedAt: '2026-07-14T09:00:00.000Z',
        activeFrom: '2026-07-14T09:00:00.000Z',
        expiresAt: '2026-07-15T09:00:00.000Z',
        dataMode: 'RECORDED',
        resultVersion: 1,
        etagRevision: 3,
        snapshotChecksum: `sha256:${'a'.repeat(64)}`,
        ruleSetVersion: 'advisory-rules-v1',
        riskScore: 84,
        confidenceScore: 78,
        title: 'Irrigation is needed',
        summary: 'मातीतील ओलावा कमी आहे आणि पुढील दोन दिवस पाऊस कमी आहे.',
        recommendedAction: {
          actionKind: 'IRRIGATE',
          label: 'आज पाणी द्या',
          timingLabel: 'सकाळी किंवा संध्याकाळी',
          cannotDoAlternative: 'पाणी उपलब्ध नसेल तर मल्च वापरा आणि RSK ला विचारा.',
        },
        why: [
          { code: 'LOW_SOIL_MOISTURE', label: 'Soil moisture is 14%.', contribution: 0.45 },
          {
            code: 'LOW_FORECAST_RAIN',
            label: '2 mm rain forecast in 48 hours.',
            contribution: 0.35,
          },
        ],
        evidenceRefs: [
          {
            evidenceId: EVIDENCE_ID,
            metricKey: 'soil.moisture',
            sourceName: 'Recorded Raigad sensor packet',
            freshness: 'CURRENT',
            quality: 'TRUSTED',
            dataMode: 'RECORDED',
            observedAt: '2026-07-14T08:45:00.000Z',
            limitation: 'Recorded demo evidence; not a live provider response.',
          },
        ],
        limitations: ['Recorded demo evidence; validate field conditions before action.'],
        deduplicationKey: `${PLOT_ID}:irrigation-needed`,
        alert: {
          alertId: ALERT_ID,
          lifecycleState: 'ACTIVE',
          channel: 'IN_APP',
        },
      },
    ],
  };
}

function syntheticResponse(path: string, method: string): unknown {
  if (path === '/v1/auth/return-states' && method === 'POST') {
    return { expiresAt: SERVER_TIME, returnStateId: '00000000-0000-4000-8000-000000000202' };
  }
  if (path === '/v1/auth/roles' && method === 'GET') return sessionResponse(false);
  if (path === '/v1/auth/role-contexts' && method === 'POST') {
    return {
      commandId: '00000000-0000-4000-8000-000000000203',
      disposition: 'ACCEPTED',
      eventIds: [],
      result: { id: ROLE_CONTEXT_ID, revision: 1, type: 'roleContext' },
      serverReceivedAt: SERVER_TIME,
    };
  }
  if (path === '/v1/auth/session' && method === 'GET') return sessionResponse(true);
  if (path === '/v1/farmer/bootstrap' && method === 'GET') {
    return {
      authorizationVersion: 7,
      capabilities: ['farmer.today.read', 'farmer.advisory.read', 'farmer.advisory.respond'],
      farmContextState: 'AVAILABLE',
      locale: 'mr',
      myFarm: { farms: [{ farmId: FARM_ID, plots: [{ plotId: PLOT_ID }] }] },
      onboardingState: 'COMPLETE',
      subjectId: SUBJECT_ID,
    };
  }
  if (path === `/v1/farmer/plots/${PLOT_ID}/evidence-summary` && method === 'GET') {
    return {
      plotId: PLOT_ID,
      generatedAt: '2026-07-14T09:00:00.000Z',
      cards: [],
    };
  }
  if (path === '/v1/farmer/today' && method === 'GET') return todayResponse('OFFLINE_CACHE');
  if (path === `/v1/farmer/advisories/${ADVISORY_ID}/responses` && method === 'POST') {
    return {
      commandId: '00000000-0000-4000-8000-000000000701',
      disposition: 'ACCEPTED',
      advisoryId: ADVISORY_ID,
      lifecycleState: 'ACKNOWLEDGED',
      eventIds: ['00000000-0000-4000-8000-000000000801'],
      serverReceivedAt: SERVER_TIME,
    };
  }
  return undefined;
}

async function fulfillSyntheticApi(route: Route, observedCalls: ObservedCall[]) {
  const request = route.request();
  const requestUrl = new URL(request.url());
  const method = request.method();
  const browserOrigin = request.headers()['origin'];
  const corsHeaders = {
    'Access-Control-Allow-Headers':
      request.headers()['access-control-request-headers'] ??
      'Authorization, Content-Type, Idempotency-Key, If-Match, X-Client-Build, X-Client-Installation-Id, X-Client-Schema-Version, X-Firebase-AppCheck, X-Role-Context-Id',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Origin': browserOrigin ?? E2E_APP_ORIGINS.farmer,
    'Cache-Control': 'private, no-store',
    Vary: 'Origin',
  };
  if (method === 'OPTIONS') {
    await route.fulfill({ headers: corsHeaders, status: 204 });
    return;
  }
  observedCalls.push({
    ...(method === 'POST' ? { body: request.postDataJSON() } : {}),
    ...(request.headers()['idempotency-key']
      ? { idempotencyKey: request.headers()['idempotency-key'] }
      : {}),
    ...(request.headers()['if-match'] ? { ifMatch: request.headers()['if-match'] } : {}),
    method,
    path: requestUrl.pathname,
    ...(request.headers()['x-role-context-id']
      ? { roleContextId: request.headers()['x-role-context-id'] }
      : {}),
  });
  const response = syntheticResponse(requestUrl.pathname, method);
  await route.fulfill({
    body: JSON.stringify(response ?? { code: 'DEPENDENCY_UNAVAILABLE' }),
    contentType: 'application/json',
    headers: corsHeaders,
    status: response === undefined ? 503 : 200,
  });
}

async function installMemoryIdentityBridge(page: Page) {
  await page.evaluate(
    ({ appCheckToken, eventName, idToken }) => {
      const browserWindow = window as typeof window & { smartFasalIdentity?: unknown };
      browserWindow.smartFasalIdentity = {
        credentialPersistence: 'memory',
        getAppCheckToken: () => Promise.resolve(appCheckToken),
        signIn: (input: { returnStateId: string; surface: string }) => {
          if (input.surface !== 'farmer' || input.returnStateId.length === 0) {
            return Promise.reject(new Error('SYNTHETIC_IDENTITY_SCOPE_MISMATCH'));
          }
          return Promise.resolve({ appCheckToken, idToken });
        },
        signOut: () => Promise.resolve(),
      };
      window.dispatchEvent(new Event(eventName));
    },
    {
      appCheckToken: SYNTHETIC_APP_CHECK_TOKEN,
      eventName: E2E_IDENTITY_BRIDGE_READY_EVENT,
      idToken: SYNTHETIC_ID_TOKEN,
    },
  );
}

async function openFarmerToday(page: Page, observedCalls: ObservedCall[]) {
  await page.route(`${E2E_DOMAIN_API_ORIGIN}/**`, (route) =>
    fulfillSyntheticApi(route, observedCalls),
  );
  await page.goto('/auth');
  await installMemoryIdentityBridge(page);
  await page.locator('.status-card .primary-button').click();
  await expect(page).toHaveURL(`${E2E_APP_ORIGINS.farmer}/farmer/today`);
}

test.describe('Farmer Milestone 6 advisory browser flow', () => {
  test('shows Why, evidence labels, response controls and offline cache state', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'farmer', 'Farmer advisory flow runs only on Farmer app');
    const observedCalls: ObservedCall[] = [];
    await openFarmerToday(page, observedCalls);

    await expect(page.getByRole('heading', { name: 'आजची सूचना' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Irrigation is needed' })).toBeVisible();
    await expect(page.getByText('ACTION · TODAY')).toBeVisible();
    await expect(page.getByText('आज पाणी द्या')).toBeVisible();
    await expect(page.getByText('सकाळी किंवा संध्याकाळी')).toBeVisible();
    await expect(page.getByText('78%')).toBeVisible();
    await expect(page.getByText('OFFLINE_CACHE')).toBeVisible();
    await expect(page.locator('.source-pill').filter({ hasText: 'RECORDED' })).toBeVisible();

    await page.getByText('ही सूचना का आली?').click();
    await expect(page.getByText('Soil moisture is 14%.')).toBeVisible();
    await expect(page.getByText('2 mm rain forecast in 48 hours.')).toBeVisible();
    await expect(page.getByText(/Source: Recorded Raigad sensor packet · RECORDED/u)).toBeVisible();
    await expect(
      page.getByText('Recorded demo evidence; validate field conditions before action.'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'समजले' }).click();
    await expect(page.getByRole('status')).toHaveText('सूचना मान्य केली.');
    await page.getByRole('button', { name: 'नंतर आठवण' }).click();
    await expect(page.getByRole('status')).toHaveText('सूचना थोड्या वेळासाठी पुढे ढकलली.');
    await page.getByRole('button', { name: 'काम पूर्ण' }).click();
    await expect(page.getByRole('status')).toHaveText('काम पूर्ण म्हणून नोंदवले.');

    const responses = observedCalls.filter(
      (call) =>
        call.method === 'POST' && call.path === `/v1/farmer/advisories/${ADVISORY_ID}/responses`,
    );
    expect(responses.map((call) => (call.body as { response?: string }).response)).toEqual([
      'ACKNOWLEDGE',
      'SNOOZE',
      'MARK_ACTION_COMPLETED',
    ]);
    expect(responses.every((call) => call.roleContextId === ROLE_CONTEXT_ID)).toBe(true);
    expect(responses.every((call) => call.ifMatch === '"rev:3"')).toBe(true);
    expect(responses.every((call) => call.idempotencyKey !== undefined)).toBe(true);
  });

  test('shows a safe offline/unavailable state when advisory response sync fails', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'farmer', 'Farmer advisory flow runs only on Farmer app');
    const observedCalls: ObservedCall[] = [];
    await page.route(`${E2E_DOMAIN_API_ORIGIN}/**`, async (route) => {
      const requestUrl = new URL(route.request().url());
      if (
        route.request().method() === 'POST' &&
        requestUrl.pathname === `/v1/farmer/advisories/${ADVISORY_ID}/responses`
      ) {
        await route.fulfill({
          body: JSON.stringify({ code: 'DEPENDENCY_UNAVAILABLE' }),
          contentType: 'application/json',
          status: 503,
        });
        return;
      }
      await fulfillSyntheticApi(route, observedCalls);
    });
    await page.goto('/auth');
    await installMemoryIdentityBridge(page);
    await page.locator('.status-card .primary-button').click();

    await page.getByRole('button', { name: 'समजले' }).click();
    await expect(page.getByRole('status')).toHaveText('समक्रमण उपलब्ध नाही. पुन्हा प्रयत्न करा.');
  });
});
