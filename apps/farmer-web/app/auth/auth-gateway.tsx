'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { messages, supportedLocales } from '@smart-fasal/i18n';

import { createFarmerReturnState, establishFarmerRole, type ShellIssue } from '../lib/farmer-api';
import { useAuthMemory } from './auth-memory';

const AUTH_ISSUE_COPY = {
  unauthenticated: ['stateUnauthenticatedTitle', 'stateUnauthenticatedBody'],
  denied: ['stateDeniedTitle', 'stateDeniedBody'],
  expired: ['stateExpiredTitle', 'stateExpiredBody'],
  withdrawn: ['stateWithdrawnTitle', 'stateWithdrawnBody'],
  unavailable: ['stateUnavailableTitle', 'stateUnavailableBody'],
} as const satisfies Record<ShellIssue, readonly [string, string]>;

interface FarmerAuthGatewayProps {
  readonly createReturnState?: typeof createFarmerReturnState;
  readonly establishRole?: typeof establishFarmerRole;
}

export function FarmerAuthGateway({
  createReturnState = createFarmerReturnState,
  establishRole = establishFarmerRole,
}: FarmerAuthGatewayProps = {}) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const roleCommandRef = useRef({
    commandId: globalThis.crypto.randomUUID(),
    recordedAt: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
  });
  const { beginSignIn, installationId, locale, providerState, setLocale, setRoleContextId } =
    useAuthMemory();
  const [phase, setPhase] = useState<'idle' | 'working'>('idle');
  const [issue, setIssue] = useState<ShellIssue | null>(null);
  const copy = messages[locale];

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function handleSignIn() {
    setPhase('working');
    setIssue(null);
    try {
      const signedInCredentials = await beginSignIn(async (appCheckToken) => {
        const returnStateId = await createReturnState(appCheckToken, installationId);
        return returnStateId;
      });
      const result = await establishRole(signedInCredentials, installationId, {
        roleCommand: roleCommandRef.current,
      });
      if (typeof result === 'string') {
        setIssue(result);
        setPhase('idle');
        return;
      }
      setRoleContextId(result.roleContextId);
      router.replace('/farmer/today');
    } catch {
      setIssue('unavailable');
      setPhase('idle');
    }
  }

  const issueCopy = issue ? AUTH_ISSUE_COPY[issue] : null;

  return (
    <div className="auth-shell" lang={locale}>
      <a className="skip-link" href="#auth-content">
        {copy.skipToContent}
      </a>
      <header className="simple-header">
        <strong>{copy.appName}</strong>
        <span>Farmer · Raigad</span>
      </header>
      <main id="auth-content" className="auth-main">
        <section className="auth-card" aria-labelledby="auth-title">
          <p className="eyebrow">{copy.authEyebrow}</p>
          <h1 autoFocus id="auth-title" ref={headingRef} tabIndex={-1}>
            {copy.farmerAuthHeading}
          </h1>
          <p className="lead">{copy.authBody}</p>

          <fieldset className="language-picker">
            <legend>{copy.languageLabel}</legend>
            {supportedLocales.map((option) => (
              <button
                aria-pressed={locale === option}
                className="choice-button"
                key={option}
                onClick={() => setLocale(option)}
                type="button"
              >
                {option === 'mr'
                  ? copy.languageMarathi
                  : option === 'hi'
                    ? copy.languageHindi
                    : copy.languageEnglish}
              </button>
            ))}
          </fieldset>

          <div className="status-card" aria-live="polite">
            {providerState === 'checking' || phase === 'working' ? (
              <>
                <h2>{copy.stateLoadingTitle}</h2>
                <p>{phase === 'working' ? copy.authSigningIn : copy.stateLoadingBody}</p>
              </>
            ) : providerState === 'unavailable' ? (
              <>
                <h2>{copy.authProviderUnavailableTitle}</h2>
                <p>{copy.authProviderUnavailableBody}</p>
              </>
            ) : issueCopy ? (
              <>
                <h2>{copy[issueCopy[0]]}</h2>
                <p>{copy[issueCopy[1]]}</p>
                <button className="primary-button" onClick={handleSignIn} type="button">
                  {copy.actionRetry}
                </button>
              </>
            ) : (
              <>
                <h2>{copy.authHeading}</h2>
                <p>{copy.authConnectedOnly}</p>
                <button className="primary-button" onClick={handleSignIn} type="button">
                  {copy.authSignIn}
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
