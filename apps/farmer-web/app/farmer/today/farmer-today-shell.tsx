'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { messages } from '@smart-fasal/i18n';

import { useAuthMemory } from '../../auth/auth-memory';
import {
  loadFarmerShell,
  revokeFarmerRoleContext,
  type FarmerShellState,
  type ShellIssue,
} from '../../lib/farmer-api';
import { isFarmerVoiceTransportConfigured, submitFarmerVoiceText } from '../../lib/voice-api';
import { prepareFarmerOfflineForSignOut } from '../../offline/offline-exit-coordinator';
import { FarmerNavigation } from './farmer-navigation';

interface FarmerTodayShellProps {
  readonly loadState?: typeof loadFarmerShell;
  readonly prepareOfflineExit?: typeof prepareFarmerOfflineForSignOut;
  readonly revokeRoleContext?: typeof revokeFarmerRoleContext;
}

type RenderState = FarmerShellState | { readonly kind: 'loading' };

const SESSION_REVALIDATION_MS = 60_000;
const SIGN_OUT_REVOCATION_TIMEOUT_MS = 5_000;

const SIGN_OUT_BLOCKED_COPY = {
  en: 'Unsynced work is still on this phone. Connect and sync before signing out.',
  hi: 'इस फ़ोन पर अभी सिंक न किया गया काम है। साइन आउट करने से पहले कनेक्ट करके सिंक करें।',
  mr: 'या फोनवर अजून समक्रमित न केलेले काम आहे. साइन आउट करण्यापूर्वी जोडणी करून समक्रमित करा.',
} as const;

function shortIdentity(subjectId: string): string {
  return `••••${subjectId.slice(-8)}`;
}

const STATE_COPY: Record<
  ShellIssue,
  readonly [
    (
      | 'stateUnauthenticatedTitle'
      | 'stateDeniedTitle'
      | 'stateExpiredTitle'
      | 'stateWithdrawnTitle'
      | 'stateUnavailableTitle'
    ),
    (
      | 'stateUnauthenticatedBody'
      | 'stateDeniedBody'
      | 'stateExpiredBody'
      | 'stateWithdrawnBody'
      | 'stateUnavailableBody'
    ),
  ]
> = {
  unauthenticated: ['stateUnauthenticatedTitle', 'stateUnauthenticatedBody'],
  denied: ['stateDeniedTitle', 'stateDeniedBody'],
  expired: ['stateExpiredTitle', 'stateExpiredBody'],
  withdrawn: ['stateWithdrawnTitle', 'stateWithdrawnBody'],
  unavailable: ['stateUnavailableTitle', 'stateUnavailableBody'],
};

export function FarmerTodayShell({
  loadState = loadFarmerShell,
  prepareOfflineExit = prepareFarmerOfflineForSignOut,
  revokeRoleContext = revokeFarmerRoleContext,
}: FarmerTodayShellProps) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const signOutCommandRef = useRef<string | undefined>(undefined);
  const { credentials, installationId, locale, roleContextId, signOut } = useAuthMemory();
  const [retry, setRetry] = useState(0);
  const [signOutFailure, setSignOutFailure] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [state, setState] = useState<RenderState>({ kind: 'loading' });
  const copy = messages[locale];

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!credentials || !roleContextId) {
      return;
    }
    const controller = new AbortController();
    let current = true;
    const revalidationTimer = window.setTimeout(() => {
      if (current) setRetry((value) => value + 1);
    }, SESSION_REVALIDATION_MS);
    void loadState(credentials, installationId, {
      roleContextId,
      signal: controller.signal,
    }).then(
      (nextState) => {
        if (current) setState(nextState);
      },
      () => {
        if (current && !controller.signal.aborted) setState({ kind: 'unavailable' });
      },
    );
    return () => {
      current = false;
      window.clearTimeout(revalidationTimer);
      controller.abort();
    };
  }, [credentials, installationId, loadState, retry, roleContextId]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutFailure(false);
    try {
      await prepareOfflineExit();
    } catch {
      setSignOutFailure(true);
      setSigningOut(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), SIGN_OUT_REVOCATION_TIMEOUT_MS);
    try {
      if (credentials && roleContextId) {
        signOutCommandRef.current ??= globalThis.crypto.randomUUID();
        let revoked = false;
        for (let attempt = 0; attempt < 2 && !revoked && !controller.signal.aborted; attempt += 1) {
          revoked = await revokeRoleContext(credentials, installationId, roleContextId, {
            revokeCommandId: signOutCommandRef.current,
            signal: controller.signal,
          });
        }
      }
    } catch {
      // Local credentials must still be cleared if the revocation service is unavailable.
    } finally {
      window.clearTimeout(timeout);
    }
    try {
      await signOut();
      router.replace('/auth');
    } catch {
      setSignOutFailure(true);
      setSigningOut(false);
    }
  }

  const viewState: RenderState = credentials
    ? roleContextId
      ? state
      : { kind: 'denied' }
    : { kind: 'unauthenticated' };
  const issueCopy =
    viewState.kind === 'ready' || viewState.kind === 'loading' ? null : STATE_COPY[viewState.kind];

  return (
    <div className="farmer-app" lang={locale}>
      <a className="skip-link" href="#main-content">
        {copy.skipToContent}
      </a>
      <header className="app-header">
        <div>
          <strong>{copy.appName}</strong>
          <span>Farmer · Raigad pilot</span>
        </div>
        {credentials ? (
          <button
            className="text-button"
            disabled={signingOut}
            onClick={handleSignOut}
            type="button"
          >
            {copy.actionSignOut}
          </button>
        ) : null}
      </header>
      <main id="main-content" className="page-content">
        <p className="eyebrow">Milestone 2 · Offline and voice foundation</p>
        <h1 ref={headingRef} tabIndex={-1}>
          {copy.farmerTodayHeading}
        </h1>

        {signOutFailure ? (
          <p className="status-card" role="status">
            {SIGN_OUT_BLOCKED_COPY[locale]}
          </p>
        ) : null}

        {viewState.kind === 'ready' ? (
          <div className="ready-layout">
            <p className="lead">{copy.farmerTodayBody}</p>
            <dl className="context-grid" aria-label={copy.farmerContextTitle}>
              <div>
                <dt>{copy.contextVerifiedIdentity}</dt>
                <dd>{shortIdentity(viewState.subjectId)}</dd>
              </div>
              <div>
                <dt>{copy.contextRole}</dt>
                <dd>{viewState.role}</dd>
              </div>
              <div>
                <dt>{copy.contextEnvironment}</dt>
                <dd>{viewState.environment}</dd>
              </div>
              <div>
                <dt>{copy.contextAuthorization}</dt>
                <dd>
                  {copy.contextCurrent} · v{viewState.authorizationVersion}
                </dd>
              </div>
            </dl>
            <section className="boundary-card" aria-labelledby="farmer-context-title">
              <h2 id="farmer-context-title">{copy.farmerContextTitle}</h2>
              <p>{copy.farmerContextUnavailable}</p>
              <p className="technical-state">{viewState.farmContextState}</p>
            </section>
          </div>
        ) : viewState.kind === 'loading' ? (
          <section className="status-card" aria-live="polite">
            <h2>{copy.stateLoadingTitle}</h2>
            <p>{copy.stateLoadingBody}</p>
          </section>
        ) : issueCopy ? (
          <section className="status-card" aria-live="polite">
            <h2>{copy[issueCopy[0]]}</h2>
            <p>{copy[issueCopy[1]]}</p>
            {viewState.kind === 'unavailable' ? (
              <button
                className="primary-button"
                onClick={() => {
                  setState({ kind: 'loading' });
                  setRetry((value) => value + 1);
                }}
                type="button"
              >
                {copy.actionRetry}
              </button>
            ) : (
              <Link className="primary-link" href="/auth">
                {copy.actionGoToAuth}
              </Link>
            )}
          </section>
        ) : null}
      </main>
      {viewState.kind === 'ready' && credentials && roleContextId ? (
        <FarmerNavigation
          currentRoute="/farmer/today"
          locale={locale}
          submitText={(text, signal) =>
            submitFarmerVoiceText(credentials, installationId, roleContextId, {
              currentRoute: '/farmer/today',
              language: locale,
              signal,
              text,
            })
          }
          transportConfigured={isFarmerVoiceTransportConfigured()}
        />
      ) : null}
    </div>
  );
}
