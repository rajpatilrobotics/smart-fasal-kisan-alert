'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { FarmerCaseListResponse } from '@smart-fasal/contracts/schemas';

import { useAuthMemory } from '../../auth/auth-memory';
import { loadFarmerCases } from '../../lib/farmer-api';

type ViewState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly cases: FarmerCaseListResponse }
  | { readonly kind: 'error'; readonly message: string };

export function FarmerCasesClient() {
  const { credentials, installationId, roleContextId } = useAuthMemory();
  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const authMissing = !credentials || !roleContextId;

  useEffect(() => {
    if (authMissing) return;
    const controller = new AbortController();
    void loadFarmerCases(credentials, installationId, roleContextId, {
      signal: controller.signal,
    }).then(
      (cases) => setState({ kind: 'ready', cases }),
      () => {
        if (!controller.signal.aborted) {
          setState({ kind: 'error', message: 'Expert cases are unavailable.' });
        }
      },
    );
    return () => controller.abort();
  }, [authMissing, credentials, installationId, roleContextId]);

  const displayState: ViewState = authMissing
    ? { kind: 'error', message: 'Sign in as the Farmer to view expert cases.' }
    : state;
  const cases = displayState.kind === 'ready' ? displayState.cases.cases : [];

  return (
    <main className="recommendation-screen">
      <p className="eyebrow">RSK expert service</p>
      <h1>My expert cases</h1>
      <p className="lead">
        Cases appear only after you allow sharing for a Crop Health escalation. Declined sharing
        creates no evidence pack.
      </p>
      {displayState.kind === 'loading' ? <p aria-live="polite">Loading cases…</p> : null}
      {displayState.kind === 'error' ? <p role="status">{displayState.message}</p> : null}
      <div className="crop-list">
        {cases.length === 0 && displayState.kind === 'ready' ? (
          <section className="recommendation-panel">
            <h2>No expert cases yet</h2>
            <p>When a severe or uncertain Crop Health report is shared, it will appear here.</p>
          </section>
        ) : null}
        {cases.map((item) => (
          <article className="crop-card" key={item.caseId}>
            <div className="crop-card-header">
              <div>
                <p className="rank-label">{item.status}</p>
                <h2>{item.title}</h2>
              </div>
              <span className="state-chip">{item.dataMode}</span>
            </div>
            <dl className="score-grid">
              <div>
                <dt>Severity</dt>
                <dd>{item.severity}</dd>
              </div>
              <div>
                <dt>Expert</dt>
                <dd>{item.pendingExpert ? 'Pending' : 'Updated'}</dd>
              </div>
            </dl>
            <Link className="primary-link" href={`/farmer/cases/${item.caseId}`}>
              Open case
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
