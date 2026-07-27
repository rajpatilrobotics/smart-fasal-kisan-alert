'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { FarmerCaseResponse } from '@smart-fasal/contracts/schemas';

import { useAuthMemory } from '../../../auth/auth-memory';
import { loadFarmerCase } from '../../../lib/farmer-api';

interface FarmerCaseDetailsClientProps {
  readonly caseId: string;
}

type ViewState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly farmerCase: FarmerCaseResponse }
  | { readonly kind: 'error'; readonly message: string };

export function FarmerCaseDetailsClient({ caseId }: FarmerCaseDetailsClientProps) {
  const { credentials, installationId, roleContextId } = useAuthMemory();
  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const authMissing = !credentials || !roleContextId;

  useEffect(() => {
    if (authMissing) return;
    const controller = new AbortController();
    void loadFarmerCase(credentials, installationId, roleContextId, caseId, {
      signal: controller.signal,
    }).then(
      (farmerCase) => setState({ kind: 'ready', farmerCase }),
      () => {
        if (!controller.signal.aborted) {
          setState({ kind: 'error', message: 'This expert case is unavailable.' });
        }
      },
    );
    return () => controller.abort();
  }, [authMissing, caseId, credentials, installationId, roleContextId]);

  const displayState: ViewState = authMissing
    ? { kind: 'error', message: 'Sign in as the Farmer to view this expert case.' }
    : state;
  const farmerCase = displayState.kind === 'ready' ? displayState.farmerCase : undefined;

  return (
    <main className="recommendation-screen">
      <p className="eyebrow">Expert case · {farmerCase?.dataMode ?? 'loading'}</p>
      <h1>{farmerCase?.title ?? 'Crop Health case'}</h1>
      <p className="lead">
        This is the farmer-safe view of the RSK expert loop. AI triage and expert guidance remain
        separate records.
      </p>
      {displayState.kind === 'loading' ? <p aria-live="polite">Loading case…</p> : null}
      {displayState.kind === 'error' ? <p role="status">{displayState.message}</p> : null}
      {farmerCase ? (
        <>
          <section className="recommendation-panel" aria-labelledby="case-status-heading">
            <h2 id="case-status-heading">Current status</h2>
            <dl className="score-grid">
              <div>
                <dt>Status</dt>
                <dd>{farmerCase.status}</dd>
              </div>
              <div>
                <dt>Severity</dt>
                <dd>{farmerCase.severity}</dd>
              </div>
              <div>
                <dt>Expert</dt>
                <dd>{farmerCase.pendingExpert ? 'Pending' : 'Updated'}</dd>
              </div>
              <div>
                <dt>Pack expires</dt>
                <dd>{new Date(farmerCase.evidencePackExpiresAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </section>
          <section className="recommendation-panel" aria-labelledby="case-report-heading">
            <h2 id="case-report-heading">Linked Crop Health report</h2>
            <p>{farmerCase.report.triage?.summary ?? farmerCase.report.symptomSummary}</p>
            <p className="evidence-note">
              Possible/unclear triage only. No confirmed diagnosis or chemical dose is generated.
            </p>
            <Link className="primary-link" href={`/farmer/health/${farmerCase.reportId}`}>
              Open report
            </Link>
          </section>
          <section className="recommendation-panel" aria-labelledby="timeline-heading">
            <h2 id="timeline-heading">Timeline</h2>
            <ul>
              {farmerCase.timeline.map((item) => (
                <li key={`${item.at}-${item.state}`}>
                  {item.label} · {new Date(item.at).toLocaleString()}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
}
