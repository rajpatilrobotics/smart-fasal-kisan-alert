'use client';

import {
  createFirebaseIdentityBridge,
  createInMemoryAuth,
  IDENTITY_BRIDGE_READY_EVENT,
  type IdentityBridge as BrowserIdentityBridge,
  type InMemoryCredentials,
} from '@smart-fasal/browser-auth';

export { IDENTITY_BRIDGE_READY_EVENT };
export type { InMemoryCredentials };
export type IdentityBridge = BrowserIdentityBridge<'farmer'>;

const firebaseIdentityBridge =
  typeof window === 'undefined'
    ? undefined
    : createFirebaseIdentityBridge({
        surface: 'farmer',
        environment: process.env.NEXT_PUBLIC_FARMER_SMART_FASAL_ENVIRONMENT,
        apiKey: process.env.NEXT_PUBLIC_FARMER_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FARMER_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FARMER_FIREBASE_PROJECT_ID,
        appId: process.env.NEXT_PUBLIC_FARMER_FIREBASE_APP_ID,
        appCheckEnterpriseSiteKey:
          process.env.NEXT_PUBLIC_FARMER_FIREBASE_APPCHECK_ENTERPRISE_SITE_KEY,
      });

export const { AuthMemoryProvider, useAuthMemory } = createInMemoryAuth({
  surface: 'farmer',
  initialLocale: 'mr',
  allowInjectedIdentityBridge:
    process.env.NODE_ENV === 'test' || process.env.NEXT_PUBLIC_CLIENT_BUILD === 'e2e-synthetic',
  ...(firebaseIdentityBridge === undefined ? {} : { identityBridge: firebaseIdentityBridge }),
});
