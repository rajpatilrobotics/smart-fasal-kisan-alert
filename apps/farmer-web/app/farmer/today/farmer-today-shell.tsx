'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { messages } from '@smart-fasal/i18n';

import { useAuthMemory } from '../../auth/auth-memory';
import {
  loadFarmerShell,
  respondToFarmerAdvisory,
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
  const [advisoryStatus, setAdvisoryStatus] = useState<string | undefined>(undefined);
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

  async function handleAdvisoryResponse(
    advisoryId: string,
    expectedRevision: number,
    response: 'ACKNOWLEDGE' | 'SNOOZE' | 'MARK_ACTION_COMPLETED',
  ) {
    if (!credentials || !roleContextId) return;
    setAdvisoryStatus('जतन करत आहे…');
    try {
      await respondToFarmerAdvisory(credentials, installationId, roleContextId, advisoryId, {
        commandId: globalThis.crypto.randomUUID(),
        expectedRevision,
        response,
        ...(response === 'SNOOZE'
          ? { snoozeUntil: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() }
          : {}),
        clientRecordedAt: new Date().toISOString(),
        timezone: 'Asia/Kolkata',
      });
      setAdvisoryStatus(
        response === 'ACKNOWLEDGE'
          ? 'सूचना मान्य केली.'
          : response === 'SNOOZE'
            ? 'सूचना थोड्या वेळासाठी पुढे ढकलली.'
            : 'काम पूर्ण म्हणून नोंदवले.',
      );
    } catch {
      setAdvisoryStatus('समक्रमण उपलब्ध नाही. पुन्हा प्रयत्न करा.');
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
            {viewState.today?.cards[0] ? (
              <section className="evidence-panel" aria-labelledby="today-advisory-title">
                <div className="section-heading-row">
                  <div>
                    <p className="eyebrow">Milestone 6 · Real-Time Advisory</p>
                    <h2 id="today-advisory-title">आजची सूचना</h2>
                  </div>
                  <span className="source-pill">{viewState.today.cards[0].dataMode}</span>
                </div>
                <article className="evidence-card">
                  <div className="evidence-card-header">
                    <h3>{viewState.today.cards[0].title}</h3>
                    <span
                      className={`state-chip state-chip-${viewState.today.cards[0].severity.toLowerCase()}`}
                    >
                      {viewState.today.cards[0].severity} · {viewState.today.cards[0].urgency}
                    </span>
                  </div>
                  <p className="lead">{viewState.today.cards[0].summary}</p>
                  <dl className="evidence-meta">
                    <div>
                      <dt>करायची कृती</dt>
                      <dd>{viewState.today.cards[0].recommendedAction.label}</dd>
                    </div>
                    <div>
                      <dt>वेळ</dt>
                      <dd>{viewState.today.cards[0].recommendedAction.timingLabel}</dd>
                    </div>
                    <div>
                      <dt>विश्वास</dt>
                      <dd>{viewState.today.cards[0].confidenceScore}%</dd>
                    </div>
                    <div>
                      <dt>ताजेपणा</dt>
                      <dd>
                        {viewState.today.cards[0].evidenceRefs[0]?.freshness ?? 'UNAVAILABLE'}
                      </dd>
                    </div>
                    <div>
                      <dt>समक्रमण</dt>
                      <dd>{viewState.today.syncState}</dd>
                    </div>
                  </dl>
                  <details className="evidence-note">
                    <summary>ही सूचना का आली?</summary>
                    <ul>
                      {viewState.today.cards[0].why.map((reason) => (
                        <li key={reason.code}>{reason.label}</li>
                      ))}
                    </ul>
                    <p>
                      Source:{' '}
                      {viewState.today.cards[0].evidenceRefs[0]?.sourceName ?? 'Unavailable'} ·{' '}
                      {viewState.today.cards[0].evidenceRefs[0]?.dataMode ??
                        viewState.today.cards[0].dataMode}
                    </p>
                    {viewState.today.cards[0].limitations[0] ? (
                      <p>{viewState.today.cards[0].limitations[0]}</p>
                    ) : null}
                  </details>
                  <div className="action-row" aria-label="Advisory actions">
                    <button
                      className="primary-button"
                      onClick={() =>
                        handleAdvisoryResponse(
                          viewState.today!.cards[0]!.advisoryId,
                          viewState.today!.cards[0]!.etagRevision,
                          'ACKNOWLEDGE',
                        )
                      }
                      type="button"
                    >
                      समजले
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        handleAdvisoryResponse(
                          viewState.today!.cards[0]!.advisoryId,
                          viewState.today!.cards[0]!.etagRevision,
                          'SNOOZE',
                        )
                      }
                      type="button"
                    >
                      नंतर आठवण
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        handleAdvisoryResponse(
                          viewState.today!.cards[0]!.advisoryId,
                          viewState.today!.cards[0]!.etagRevision,
                          'MARK_ACTION_COMPLETED',
                        )
                      }
                      type="button"
                    >
                      काम पूर्ण
                    </button>
                  </div>
                  {advisoryStatus ? (
                    <p className="technical-state" role="status">
                      {advisoryStatus}
                    </p>
                  ) : null}
                </article>
              </section>
            ) : null}
            {viewState.evidenceSummary ? (
              <section className="evidence-panel" aria-labelledby="evidence-title">
                <div className="section-heading-row">
                  <div>
                    <p className="eyebrow">Milestone 4</p>
                    <h2 id="evidence-title">{copy.evidenceTitle}</h2>
                  </div>
                  <span className="source-pill">{copy.evidenceReadOnly}</span>
                </div>
                <div className="evidence-grid">
                  {viewState.evidenceSummary.cards.map((card) => (
                    <article className="evidence-card" key={card.cardId}>
                      <div className="evidence-card-header">
                        <h3>{card.title}</h3>
                        <span className={`state-chip state-chip-${card.status.toLowerCase()}`}>
                          {card.status}
                        </span>
                      </div>
                      {card.primary ? (
                        <>
                          <p className="evidence-value">
                            {card.primary.value.normalizedValue ?? card.primary.value.state}{' '}
                            <span>{card.primary.value.normalizedUnit}</span>
                          </p>
                          <dl className="evidence-meta">
                            <div>
                              <dt>{copy.evidenceMode}</dt>
                              <dd>{card.primary.dataMode}</dd>
                            </div>
                            <div>
                              <dt>{copy.evidenceFreshness}</dt>
                              <dd>{card.primary.freshness}</dd>
                            </div>
                            <div>
                              <dt>{copy.evidenceQuality}</dt>
                              <dd>{card.primary.quality}</dd>
                            </div>
                            <div>
                              <dt>{copy.evidenceSource}</dt>
                              <dd>{card.primary.source.sourceName}</dd>
                            </div>
                          </dl>
                          <p className="evidence-note">{card.primary.limitations[0]}</p>
                        </>
                      ) : (
                        <p className="evidence-note">{copy.evidenceEmpty}</p>
                      )}
                    </article>
                  ))}
                </div>
                {viewState.firstFarmId && viewState.firstPlotId ? (
                  <Link
                    className="primary-link"
                    href={`/farmer/farms/${viewState.firstFarmId}/plots/${viewState.firstPlotId}/recommendations`}
                  >
                    Open crop recommendation
                  </Link>
                ) : null}
              </section>
            ) : null}
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
