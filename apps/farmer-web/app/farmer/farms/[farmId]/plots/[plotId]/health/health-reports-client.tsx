'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { HealthReportListResponse } from '@smart-fasal/contracts/schemas';

import { useAuthMemory } from '../../../../../../auth/auth-memory';
import { loadHealthReports } from '../../../../../../lib/farmer-api';

interface HealthReportsClientProps {
  readonly farmId: string;
  readonly plotId: string;
}

type ViewState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly reports: HealthReportListResponse }
  | { readonly kind: 'error'; readonly message: string };

export function HealthReportsClient({ farmId, plotId }: HealthReportsClientProps) {
  const { credentials, installationId, roleContextId } = useAuthMemory();
  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const authMissing = !credentials || !roleContextId;

  useEffect(() => {
    if (authMissing) return;
    const controller = new AbortController();
    void loadHealthReports(credentials, installationId, roleContextId, plotId, {
      signal: controller.signal,
    }).then(
      (reports) => setState({ kind: 'ready', reports }),
      () => {
        if (!controller.signal.aborted) {
          setState({ kind: 'error', message: 'Crop Health reports are unavailable.' });
        }
      },
    );
    return () => controller.abort();
  }, [authMissing, credentials, installationId, plotId, roleContextId]);

  const displayState: ViewState = authMissing
    ? { kind: 'error', message: 'Sign in as the Farmer to view Crop Health reports.' }
    : state;
  const reports = displayState.kind === 'ready' ? displayState.reports.reports : [];

  return (
    <main className="recommendation-screen">
      <p className="eyebrow">Milestone 7 · Crop Health</p>
      <h1>Crop Health reports</h1>
      <p className="lead">
        Capture guided photos and symptoms, then show conservative triage as possible or unclear —
        never as a confirmed diagnosis.
      </p>
      <section className="recommendation-actions" aria-label="Crop Health actions">
        <Link className="primary-action" href={`/farmer/farms/${farmId}/plots/${plotId}/health/new`}>
          Report crop problem
        </Link>
        <Link className="secondary-action" href="/farmer/cases">
          View expert cases
        </Link>
      </section>
      {displayState.kind === 'loading' ? <p aria-live="polite">Loading reports…</p> : null}
      {displayState.kind === 'error' ? <p role="status">{displayState.message}</p> : null}
      <div className="crop-list">
        {reports.length === 0 && displayState.kind === 'ready' ? (
          <section className="recommendation-panel">
            <h2>No reports yet</h2>
            <p>Start with the guided capture flow when you see a crop problem.</p>
          </section>
        ) : null}
        {reports.map((report) => (
          <article className="crop-card" key={report.reportId}>
            <div className="crop-card-header">
              <div>
                <p className="rank-label">{report.cropName}</p>
                <h2>{report.triage?.summary ?? report.symptomSummary}</h2>
              </div>
              <span className="state-chip">{report.dataMode}</span>
            </div>
            <dl className="score-grid">
              <div>
                <dt>Status</dt>
                <dd>{report.state}</dd>
              </div>
              <div>
                <dt>Sharing</dt>
                <dd>{report.sharingDecision}</dd>
              </div>
            </dl>
            <p className="evidence-note">
              Evidence quality: {report.quality?.qualityBand ?? 'Waiting for media'}
            </p>
            <Link className="primary-link" href={`/farmer/health/${report.reportId}`}>
              Open report details
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
