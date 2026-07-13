import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

import {
  E2E_APP_ORIGINS,
  E2E_DOMAIN_API_ORIGIN,
  E2E_IDENTITY_BRIDGE_READY_EVENT,
  E2E_MP_QUERY_API_ORIGIN,
} from './origins';

type ProjectName = keyof typeof E2E_APP_ORIGINS;
type RoleType = 'FARMER' | 'RSK' | 'MP';

interface Scenario {
  readonly appOrigin: string;
  readonly bootstrapPath?: '/v1/farmer/bootstrap' | '/v1/rsk/bootstrap';
  readonly destination: '/farmer/today' | '/rsk/work' | '/mp/overview';
  readonly jurisdictionId?: string;
  readonly mfaState: 'NOT_REQUIRED' | 'CURRENT';
  readonly officeId?: string;
  readonly project: ProjectName;
  readonly purposeCode: 'farmer.self_service' | 'assisted.service' | 'data.rights';
  readonly roleGrantId: string;
  readonly roleType: RoleType;
  readonly subjectType: 'FARMER' | 'STAFF';
  readonly surface: ProjectName;
  readonly unavailableHeading: string;
}

interface ObservedCall {
  readonly appCheckPresent: boolean;
  readonly authorizationPresent: boolean;
  readonly browserOrigin?: string;
  readonly idempotencyKey?: string;
  readonly method: string;
  readonly path: string;
  readonly roleContextId?: string;
  readonly schemaVersion?: string;
  readonly targetOrigin: string;
  readonly url: string;
}

interface BrowserAuthAudit {
  historyUrls: string[];
  indexedDbWrites: string[];
  storageWrites: { key: string; storage: string; value: string }[];
}

const SUBJECT_ID = '00000000-0000-4000-8000-123456789abc';
const ROLE_CONTEXT_ID = '00000000-0000-4000-8000-000000000201';
const RETURN_STATE_ID = '00000000-0000-4000-8000-000000000202';
const OFFICE_ID = '00000000-0000-4000-8000-000000000111';
const JURISDICTION_ID = '00000000-0000-4000-8000-000000000222';
const SYNTHETIC_ID_TOKEN = 'synthetic-id-token-memory-only';
const SYNTHETIC_APP_CHECK_TOKEN = 'synthetic-app-check-memory-only';
const SERVER_TIME = '2030-01-01T00:00:00.000Z';

const scenarios: Record<ProjectName, Scenario> = {
  farmer: {
    appOrigin: E2E_APP_ORIGINS.farmer,
    bootstrapPath: '/v1/farmer/bootstrap',
    destination: '/farmer/today',
    mfaState: 'NOT_REQUIRED',
    project: 'farmer',
    purposeCode: 'farmer.self_service',
    roleGrantId: '00000000-0000-4000-8000-000000000301',
    roleType: 'FARMER',
    subjectType: 'FARMER',
    surface: 'farmer',
    unavailableHeading: 'साइन इन सध्या उपलब्ध नाही',
  },
  rsk: {
    appOrigin: E2E_APP_ORIGINS.rsk,
    bootstrapPath: '/v1/rsk/bootstrap',
    destination: '/rsk/work',
    jurisdictionId: JURISDICTION_ID,
    mfaState: 'CURRENT',
    officeId: OFFICE_ID,
    project: 'rsk',
    purposeCode: 'assisted.service',
    roleGrantId: '00000000-0000-4000-8000-000000000302',
    roleType: 'RSK',
    subjectType: 'STAFF',
    surface: 'rsk',
    unavailableHeading: 'Sign in is unavailable',
  },
  mp: {
    appOrigin: E2E_APP_ORIGINS.mp,
    destination: '/mp/overview',
    jurisdictionId: JURISDICTION_ID,
    mfaState: 'CURRENT',
    officeId: OFFICE_ID,
    project: 'mp',
    purposeCode: 'data.rights',
    roleGrantId: '00000000-0000-4000-8000-000000000303',
    roleType: 'MP',
    subjectType: 'STAFF',
    surface: 'mp',
    unavailableHeading: 'Sign in is unavailable',
  },
};

function sessionResponse(scenario: Scenario, includeActiveContext: boolean) {
  const role = {
    capabilitySetVersion: 1,
    destination: scenario.destination,
    roleGrantId: scenario.roleGrantId,
    roleType: scenario.roleType,
    ...(scenario.officeId ? { officeId: scenario.officeId } : {}),
    ...(scenario.jurisdictionId ? { jurisdictionId: scenario.jurisdictionId } : {}),
  };
  const activeRoleContext = {
    authorizationVersion: 7,
    capabilities: [],
    capabilitySetVersion: 1,
    environment: 'demo',
    purposeCode: scenario.purposeCode,
    roleContextId: ROLE_CONTEXT_ID,
    roleType: scenario.roleType,
    subjectId: SUBJECT_ID,
    ...(scenario.officeId ? { officeId: scenario.officeId } : {}),
    ...(scenario.jurisdictionId ? { jurisdictionId: scenario.jurisdictionId } : {}),
  };
  return {
    authorizationVersion: 7,
    capabilitySetVersion: 1,
    deviceBindingState: 'ACTIVE',
    environment: 'demo',
    mfaState: scenario.mfaState,
    roles: [role],
    subjectId: SUBJECT_ID,
    subjectType: scenario.subjectType,
    ...(includeActiveContext ? { activeRoleContext } : {}),
  };
}

function syntheticResponse(path: string, method: string, scenario: Scenario): unknown {
  if (path === '/v1/auth/return-states' && method === 'POST') {
    return { expiresAt: SERVER_TIME, returnStateId: RETURN_STATE_ID };
  }
  if (path === '/v1/auth/roles' && method === 'GET') return sessionResponse(scenario, false);
  if (path === '/v1/auth/role-contexts' && method === 'POST') {
    return {
      commandId: '00000000-0000-4000-8000-000000000203',
      disposition: 'ACCEPTED',
      eventIds: [],
      result: { id: ROLE_CONTEXT_ID, revision: 1, type: 'roleContext' },
      serverReceivedAt: SERVER_TIME,
    };
  }
  if (path === `/v1/auth/role-contexts/${ROLE_CONTEXT_ID}` && method === 'DELETE') {
    return {
      commandId: '00000000-0000-4000-8000-000000000204',
      disposition: 'ACCEPTED',
      eventIds: [],
      result: { id: ROLE_CONTEXT_ID, revision: 2, type: 'roleContext' },
      serverReceivedAt: SERVER_TIME,
    };
  }
  if (path === '/v1/auth/session' && method === 'GET') return sessionResponse(scenario, true);
  if (path === '/v1/farmer/bootstrap' && method === 'GET' && scenario.project === 'farmer') {
    return {
      authorizationVersion: 7,
      capabilities: [],
      farmContextState: 'UNAVAILABLE_UNTIL_SETUP',
      locale: 'mr',
      onboardingState: 'NOT_STARTED',
      subjectId: SUBJECT_ID,
    };
  }
  if (path === '/v1/rsk/bootstrap' && method === 'GET' && scenario.project === 'rsk') {
    return {
      authorizationVersion: 7,
      capabilities: [],
      jurisdictionId: JURISDICTION_ID,
      officeId: OFFICE_ID,
      subjectId: SUBJECT_ID,
      workState: 'UNAVAILABLE_UNTIL_WORK_MILESTONE',
    };
  }
  if (path === '/v1/mp/query-context' && method === 'GET' && scenario.project === 'mp') {
    return {
      activeRelease: null,
      availableMetricKeys: [],
      code: 'DEPENDENCY_UNAVAILABLE',
      state: 'UNAVAILABLE',
    };
  }
  return undefined;
}

async function fulfillSyntheticApi(
  route: Route,
  scenario: Scenario,
  observedCalls: ObservedCall[],
) {
  const request = route.request();
  const requestUrl = new URL(request.url());
  const method = request.method();
  const browserOrigin = request.headers()['origin'];
  const corsHeaders = {
    'Access-Control-Allow-Headers':
      request.headers()['access-control-request-headers'] ??
      'Authorization, Content-Type, X-Client-Build, X-Client-Installation-Id, X-Client-Schema-Version, X-Firebase-AppCheck',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Origin': browserOrigin ?? scenario.appOrigin,
    'Cache-Control': 'private, no-store',
    Vary: 'Origin',
  };

  if (method === 'OPTIONS') {
    await route.fulfill({ headers: corsHeaders, status: 204 });
    return;
  }

  observedCalls.push({
    appCheckPresent: Boolean(request.headers()['x-firebase-appcheck']),
    authorizationPresent: Boolean(request.headers()['authorization']),
    ...(browserOrigin ? { browserOrigin } : {}),
    ...(request.headers()['idempotency-key']
      ? { idempotencyKey: request.headers()['idempotency-key'] }
      : {}),
    method,
    path: requestUrl.pathname,
    ...(request.headers()['x-role-context-id']
      ? { roleContextId: request.headers()['x-role-context-id'] }
      : {}),
    ...(request.headers()['x-client-schema-version']
      ? { schemaVersion: request.headers()['x-client-schema-version'] }
      : {}),
    targetOrigin: requestUrl.origin,
    url: request.url(),
  });

  const response = syntheticResponse(requestUrl.pathname, method, scenario);
  if (response === undefined) {
    await route.fulfill({
      body: JSON.stringify({ code: 'DEPENDENCY_UNAVAILABLE' }),
      contentType: 'application/json',
      headers: corsHeaders,
      status: 503,
    });
    return;
  }
  await route.fulfill({
    body: JSON.stringify(response),
    contentType: 'application/json',
    headers: corsHeaders,
    status: 200,
  });
}

async function installBrowserPersistenceAudit(page: Page) {
  await page.addInitScript(() => {
    const browserWindow = window as typeof window & { __smartFasalAuthAudit?: BrowserAuthAudit };
    const audit: BrowserAuthAudit = {
      historyUrls: [],
      indexedDbWrites: [],
      storageWrites: [],
    };
    Object.defineProperty(browserWindow, '__smartFasalAuthAudit', {
      configurable: true,
      value: audit,
    });

    // The wrapper below always restores the receiver with Function.call.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalSetItem = Storage.prototype.setItem;
    Object.defineProperty(Storage.prototype, 'setItem', {
      configurable: true,
      value(this: Storage, key: string, value: string) {
        let storage = 'unknown';
        if (this === window.localStorage) storage = 'localStorage';
        if (this === window.sessionStorage) storage = 'sessionStorage';
        audit.storageWrites.push({ key, storage, value });
        originalSetItem.call(this, key, value);
      },
      writable: true,
    });

    const originalPushState = history.pushState.bind(history);
    history.pushState = (data, unused, url) => {
      if (url !== undefined && url !== null) audit.historyUrls.push(String(url));
      originalPushState(data, unused, url);
    };
    const originalReplaceState = history.replaceState.bind(history);
    history.replaceState = (data, unused, url) => {
      if (url !== undefined && url !== null) audit.historyUrls.push(String(url));
      originalReplaceState(data, unused, url);
    };

    if (typeof IDBObjectStore !== 'undefined') {
      for (const method of ['add', 'put'] as const) {
        const prototype = IDBObjectStore.prototype as unknown as Record<
          'add' | 'put',
          (this: IDBObjectStore, ...args: unknown[]) => IDBRequest
        >;
        const original = prototype[method];
        Object.defineProperty(prototype, method, {
          configurable: true,
          value(this: IDBObjectStore, ...args: unknown[]) {
            try {
              audit.indexedDbWrites.push(JSON.stringify(args[0]));
            } catch {
              audit.indexedDbWrites.push(String(args[0]));
            }
            return Reflect.apply(original, this, args);
          },
          writable: true,
        });
      }
    }
  });
}

async function installMemoryIdentityBridge(page: Page, scenario: Scenario) {
  await page.evaluate(
    ({ appCheckToken, eventName, idToken, surface }) => {
      const browserWindow = window as typeof window & { smartFasalIdentity?: unknown };
      browserWindow.smartFasalIdentity = {
        credentialPersistence: 'memory',
        getAppCheckToken: () => Promise.resolve(appCheckToken),
        signIn: (input: { returnStateId: string; surface: string }) => {
          if (input.surface !== surface || input.returnStateId.length === 0) {
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
      surface: scenario.surface,
    },
  );
}

async function openAuthenticatedShell(page: Page, scenario: Scenario) {
  const observedCalls: ObservedCall[] = [];
  await installBrowserPersistenceAudit(page);
  await page.route(`${E2E_DOMAIN_API_ORIGIN}/**`, (route) =>
    fulfillSyntheticApi(route, scenario, observedCalls),
  );
  await page.route(`${E2E_MP_QUERY_API_ORIGIN}/**`, (route) =>
    fulfillSyntheticApi(route, scenario, observedCalls),
  );

  await page.goto('/auth');
  await expect(page.locator('.status-card h2')).toHaveText(scenario.unavailableHeading);
  await expect(page.locator('.status-card .primary-button')).toHaveCount(0);
  await installMemoryIdentityBridge(page, scenario);
  const signIn = page.locator('.status-card .primary-button');
  await expect(signIn).toBeVisible();
  await signIn.click();
  await expect(page).toHaveURL(`${scenario.appOrigin}${scenario.destination}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  return observedCalls;
}

async function persistedBrowserEvidence(page: Page) {
  return page.evaluate(() => {
    const browserWindow = window as typeof window & { __smartFasalAuthAudit?: BrowserAuthAudit };
    const readStorage = (storage: Storage) =>
      Array.from({ length: storage.length }, (_, index) => {
        const key = storage.key(index);
        return key === null ? '' : `${key}:${storage.getItem(key) ?? ''}`;
      });
    return {
      audit: browserWindow.__smartFasalAuthAudit,
      currentUrl: window.location.href,
      localStorage: readStorage(window.localStorage),
      resourceUrls: performance.getEntriesByType('resource').map((entry) => entry.name),
      sessionStorage: readStorage(window.sessionStorage),
    };
  });
}

test('uses a synthetic memory-only identity flow without crossing stakeholder boundaries', async ({
  page,
}, testInfo) => {
  const scenario = scenarios[testInfo.project.name as ProjectName];
  const observedCalls = await openAuthenticatedShell(page, scenario);

  await expect(page.getByText('••••56789abc')).toBeVisible();
  if (scenario.project === 'farmer') {
    await expect(page.getByText('UNAVAILABLE_UNTIL_SETUP')).toBeVisible();
    await expect(page.getByText(/weather|irrigation|yield/i)).toHaveCount(0);
  }
  if (scenario.project === 'rsk') {
    await expect(page.getByText('UNAVAILABLE_UNTIL_WORK_MILESTONE')).toBeVisible();
    await expect(page.getByText(OFFICE_ID)).toBeVisible();
    await expect(page.getByText(JURISDICTION_ID)).toBeVisible();
    const accessibilityTree = await page.locator('body').ariaSnapshot();
    expect(accessibilityTree).not.toMatch(/farmer name|farmer contact|phone number|\+91/iu);
    await expect(page.getByText(/farmer name|farmer contact|phone number|\+91/iu)).toHaveCount(0);
    expect(observedCalls.some((call) => call.path.includes('protected-disclosures'))).toBe(false);
  }
  if (scenario.project === 'mp') {
    await expect(page.getByText('DEPENDENCY_UNAVAILABLE')).toBeVisible();
    await expect(page.getByText(/%|yield forecast/i)).toHaveCount(0);
  }

  expect(observedCalls.length).toBeGreaterThanOrEqual(5);
  expect(observedCalls.every((call) => call.browserOrigin === scenario.appOrigin)).toBe(true);
  expect(observedCalls.every((call) => call.appCheckPresent)).toBe(true);
  expect(observedCalls.every((call) => call.schemaVersion === '1')).toBe(true);
  expect(
    observedCalls
      .filter((call) =>
        ['/v1/auth/session', scenario.bootstrapPath, '/v1/mp/query-context'].includes(
          call.path as never,
        ),
      )
      .every((call) => call.roleContextId === ROLE_CONTEXT_ID),
  ).toBe(true);
  expect(
    observedCalls
      .filter((call) =>
        ['/v1/auth/return-states', '/v1/auth/roles', '/v1/auth/role-contexts'].includes(call.path),
      )
      .every((call) => call.roleContextId === undefined),
  ).toBe(true);
  expect(
    observedCalls
      .filter((call) => call.path.startsWith('/v1/auth/') || call.path === scenario.bootstrapPath)
      .every((call) => call.targetOrigin === E2E_DOMAIN_API_ORIGIN),
  ).toBe(true);
  const queryCalls = observedCalls.filter((call) => call.path === '/v1/mp/query-context');
  expect(queryCalls).toHaveLength(scenario.project === 'mp' ? 1 : 0);
  if (scenario.project === 'mp') {
    expect(queryCalls[0]?.targetOrigin).toBe(E2E_MP_QUERY_API_ORIGIN);
    expect(queryCalls[0]?.authorizationPresent).toBe(true);
  }

  const browserEvidence = await persistedBrowserEvidence(page);
  const serializedEvidence = JSON.stringify(browserEvidence);
  expect(serializedEvidence).not.toContain(SYNTHETIC_ID_TOKEN);
  expect(serializedEvidence).not.toContain(SYNTHETIC_APP_CHECK_TOKEN);
  expect(serializedEvidence).not.toContain(ROLE_CONTEXT_ID);
  expect(observedCalls.every((call) => !call.url.includes(SYNTHETIC_ID_TOKEN))).toBe(true);
  expect(observedCalls.every((call) => !call.url.includes(SYNTHETIC_APP_CHECK_TOKEN))).toBe(true);
  expect(observedCalls.every((call) => !call.url.includes(ROLE_CONTEXT_ID))).toBe(true);
});

test('@a11y authenticated shell has no WCAG 2.2 AA axe violations', async ({ page }, testInfo) => {
  const scenario = scenarios[testInfo.project.name as ProjectName];
  await openAuthenticatedShell(page, scenario);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});

test('revokes the active server role context before clearing the browser session', async ({
  page,
}, testInfo) => {
  const scenario = scenarios[testInfo.project.name as ProjectName];
  const observedCalls = await openAuthenticatedShell(page, scenario);

  await page.locator('.text-button').click();
  await expect(page).toHaveURL(`${scenario.appOrigin}/auth`);

  const revocations = observedCalls.filter(
    (call) => call.method === 'DELETE' && call.path === `/v1/auth/role-contexts/${ROLE_CONTEXT_ID}`,
  );
  expect(revocations).toHaveLength(1);
  expect(revocations[0]).toMatchObject({
    appCheckPresent: true,
    authorizationPresent: true,
    browserOrigin: scenario.appOrigin,
    roleContextId: ROLE_CONTEXT_ID,
    schemaVersion: '1',
    targetOrigin: E2E_DOMAIN_API_ORIGIN,
  });
  expect(revocations[0]?.idempotencyKey).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
  );
  expect(revocations[0]?.url).not.toContain(SYNTHETIC_ID_TOKEN);
  expect(revocations[0]?.url).not.toContain(SYNTHETIC_APP_CHECK_TOKEN);
});
