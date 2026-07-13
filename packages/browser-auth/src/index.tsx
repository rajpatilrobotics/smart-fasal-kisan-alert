'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import type { SupportedLocale } from '@smart-fasal/i18n';

export type AuthSurface = 'farmer' | 'rsk' | 'mp';

export interface InMemoryCredentials {
  readonly idToken: string;
  readonly appCheckToken: string;
}

export const IDENTITY_BRIDGE_READY_EVENT = 'smart-fasal:identity-bridge-ready';

export interface IdentityBridge<Surface extends AuthSurface> {
  readonly credentialPersistence: 'memory';
  getAppCheckToken(): Promise<string>;
  signIn(input: {
    readonly surface: Surface;
    readonly returnStateId: string;
  }): Promise<InMemoryCredentials>;
  signOut?(): Promise<void>;
}

export interface AuthMemoryValue {
  readonly credentials: InMemoryCredentials | null;
  readonly installationId: string;
  readonly locale: SupportedLocale;
  readonly providerState: 'checking' | 'available' | 'unavailable';
  readonly roleContextId: string | null;
  beginSignIn(
    createReturnState: (appCheckToken: string) => Promise<string>,
  ): Promise<InMemoryCredentials>;
  setLocale(locale: SupportedLocale): void;
  setRoleContextId(roleContextId: string | null): void;
  signOut(): Promise<void>;
}

interface AuthMemoryProviderProps {
  readonly children: ReactNode;
  readonly initialCredentials?: InMemoryCredentials | null;
  readonly initialRoleContextId?: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function subscribeToIdentityBridge(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  let active = true;
  window.addEventListener(IDENTITY_BRIDGE_READY_EVENT, onStoreChange);
  queueMicrotask(() => {
    if (active) onStoreChange();
  });
  return () => {
    active = false;
    window.removeEventListener(IDENTITY_BRIDGE_READY_EVENT, onStoreChange);
  };
}

function isMemoryIdentityBridge(value: unknown): value is IdentityBridge<AuthSurface> {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<IdentityBridge<AuthSurface>>;
  return (
    candidate.credentialPersistence === 'memory' &&
    typeof candidate.getAppCheckToken === 'function' &&
    typeof candidate.signIn === 'function' &&
    (candidate.signOut === undefined || typeof candidate.signOut === 'function')
  );
}

function getInjectedIdentityBridge(): IdentityBridge<AuthSurface> | undefined {
  if (typeof window === 'undefined') return undefined;
  const bridge = (window as Window & { smartFasalIdentity?: unknown }).smartFasalIdentity;
  return isMemoryIdentityBridge(bridge) ? bridge : undefined;
}

export function createInMemoryAuth<Surface extends AuthSurface>(options: {
  readonly surface: Surface;
  readonly initialLocale: SupportedLocale;
  readonly identityBridge?: IdentityBridge<Surface>;
  readonly allowInjectedIdentityBridge?: boolean;
}) {
  const AuthMemoryContext = createContext<AuthMemoryValue | null>(null);
  const resolveIdentityBridge = () =>
    options.identityBridge ??
    (options.allowInjectedIdentityBridge === true ? getInjectedIdentityBridge() : undefined);

  function AuthMemoryProvider({
    children,
    initialCredentials = null,
    initialRoleContextId = null,
  }: AuthMemoryProviderProps) {
    const [credentials, setCredentials] = useState<InMemoryCredentials | null>(initialCredentials);
    const [installationId] = useState(() => globalThis.crypto.randomUUID());
    const [locale, setLocale] = useState<SupportedLocale>(options.initialLocale);
    const [roleContextId, setRoleContextIdState] = useState<string | null>(() => {
      if (initialRoleContextId !== null && !UUID.test(initialRoleContextId)) {
        throw new Error('ROLE_CONTEXT_INVALID');
      }
      return initialRoleContextId;
    });
    const providerState = useSyncExternalStore<AuthMemoryValue['providerState']>(
      subscribeToIdentityBridge,
      () => (resolveIdentityBridge() ? 'available' : 'unavailable'),
      () => 'checking',
    );

    const value = useMemo<AuthMemoryValue>(
      () => ({
        credentials,
        installationId,
        locale,
        providerState,
        roleContextId,
        async beginSignIn(createReturnState) {
          const bridge = resolveIdentityBridge();
          if (!bridge) throw new Error('IDENTITY_PROVIDER_UNAVAILABLE');
          setCredentials(null);
          setRoleContextIdState(null);
          const appCheckToken = await bridge.getAppCheckToken();
          const returnStateId = await createReturnState(appCheckToken);
          const nextCredentials = await bridge.signIn({
            surface: options.surface,
            returnStateId,
          });
          if (!nextCredentials.idToken || !nextCredentials.appCheckToken) {
            throw new Error('IDENTITY_CREDENTIALS_INVALID');
          }
          setCredentials(nextCredentials);
          return nextCredentials;
        },
        setLocale,
        setRoleContextId(nextRoleContextId) {
          if (nextRoleContextId !== null && !UUID.test(nextRoleContextId)) {
            throw new Error('ROLE_CONTEXT_INVALID');
          }
          setRoleContextIdState(nextRoleContextId);
        },
        async signOut() {
          const bridge = resolveIdentityBridge();
          setCredentials(null);
          setRoleContextIdState(null);
          await bridge?.signOut?.();
        },
      }),
      [credentials, installationId, locale, providerState, roleContextId],
    );

    return <AuthMemoryContext value={value}>{children}</AuthMemoryContext>;
  }

  function useAuthMemory(): AuthMemoryValue {
    const value = useContext(AuthMemoryContext);
    if (!value) throw new Error('useAuthMemory must be used inside AuthMemoryProvider');
    return value;
  }

  return { AuthMemoryProvider, useAuthMemory } as const;
}

export * from './firebase-bridge';
