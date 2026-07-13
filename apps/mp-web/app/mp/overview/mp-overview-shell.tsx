'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { messages } from '@smart-fasal/i18n';
import { useAuthMemory } from '../../auth/auth-memory';
import {
  loadMpShell,
  revokeMpRoleContext,
  type MpShellState,
  type ShellIssue,
} from '../../lib/mp-api';

interface MpOverviewShellProps {
  readonly loadState?: typeof loadMpShell;
  readonly revokeRoleContext?: typeof revokeMpRoleContext;
}
type RenderState = MpShellState | { readonly kind: 'loading' };
const SESSION_REVALIDATION_MS = 60_000;
const SIGN_OUT_REVOCATION_TIMEOUT_MS = 5_000;
const STATE_KEYS: Record<ShellIssue, readonly [string, string]> = {
  unauthenticated: ['stateUnauthenticatedTitle', 'stateUnauthenticatedBody'],
  denied: ['stateDeniedTitle', 'stateDeniedBody'],
  expired: ['stateExpiredTitle', 'stateExpiredBody'],
  withdrawn: ['stateWithdrawnTitle', 'stateWithdrawnBody'],
  unavailable: ['stateUnavailableTitle', 'stateUnavailableBody'],
};

export function MpOverviewShell({
  loadState = loadMpShell,
  revokeRoleContext = revokeMpRoleContext,
}: MpOverviewShellProps) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const signOutCommandRef = useRef<string | undefined>(undefined);
  const { credentials, installationId, locale, roleContextId, signOut } = useAuthMemory();
  const [retry, setRetry] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [state, setState] = useState<RenderState>({ kind: 'loading' });
  const copy = messages[locale] as Record<string, string>;
  useEffect(() => headingRef.current?.focus(), []);
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
      (next) => {
        if (current) setState(next);
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
      void signOut().catch(() => undefined);
      router.replace('/auth');
    }
  }
  const viewState: RenderState = credentials
    ? roleContextId
      ? state
      : { kind: 'denied' }
    : { kind: 'unauthenticated' };
  const stateKeys =
    viewState.kind === 'ready' || viewState.kind === 'loading' ? null : STATE_KEYS[viewState.kind];

  return (
    <div className="mp-app" lang={locale}>
      <a className="skip-link" href="#main-content">
        {copy.skipToContent}
      </a>
      <aside className="authenticated-rail" aria-label="MP Office">
        <strong>{copy.appName}</strong>
        <span>MP Office Intelligence</span>
        <p className="rail-boundary-copy">
          Released aggregates only. No Farmer, Farm, Case, media, device or operational RSK data.
        </p>
      </aside>
      <div className="authenticated-canvas">
        <header className="simple-header">
          <span>Milestone 1 · privacy boundary</span>
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
        <main id="main-content" className="authenticated-workspace">
          <p className="eyebrow">MP Office · Secure release context</p>
          <h1 ref={headingRef} tabIndex={-1}>
            {copy.mpOverviewHeading}
          </h1>
          {viewState.kind === 'ready' ? (
            <div className="ready-layout">
              <p className="lead">{copy.mpOverviewBody}</p>
              <dl className="context-grid">
                <div>
                  <dt>{copy.contextVerifiedIdentity}</dt>
                  <dd>••••{viewState.subjectId.slice(-8)}</dd>
                </div>
                <div>
                  <dt>{copy.contextRole}</dt>
                  <dd>{viewState.role}</dd>
                </div>
                <div>
                  <dt>{copy.contextEnvironment}</dt>
                  <dd>{viewState.environment}</dd>
                </div>
                {viewState.jurisdictionId ? (
                  <div>
                    <dt>{copy.contextJurisdiction}</dt>
                    <dd>{viewState.jurisdictionId}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>{copy.contextAuthorization}</dt>
                  <dd>
                    {copy.contextCurrent} · v{viewState.authorizationVersion}
                  </dd>
                </div>
              </dl>
              <section className="boundary-card" aria-labelledby="release-state-title">
                <h2 id="release-state-title">{copy.mpReleaseTitle}</h2>
                <p>{copy.mpReleaseUnavailable}</p>
                <p className="technical-state">{viewState.releaseState}</p>
              </section>
            </div>
          ) : viewState.kind === 'loading' ? (
            <section className="status-card" aria-live="polite">
              <h2>{copy.stateLoadingTitle}</h2>
              <p>{copy.stateLoadingBody}</p>
            </section>
          ) : stateKeys ? (
            <section className="status-card" aria-live="polite">
              <h2>{copy[stateKeys[0]]}</h2>
              <p>{copy[stateKeys[1]]}</p>
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
      </div>
    </div>
  );
}
