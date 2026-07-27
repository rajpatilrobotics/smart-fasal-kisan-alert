'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { HealthReportResponse } from '@smart-fasal/contracts/schemas';

import { useAuthMemory } from '../../../auth/auth-memory';
import { decideHealthCaseSharing, loadHealthReport } from '../../../lib/farmer-api';

interface HealthReportDetailsClientProps {
  readonly reportId: string;
}

type ViewState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly report: HealthReportResponse }
  | { readonly kind: 'sharing'; readonly report: HealthReportResponse }
  | { readonly kind: 'error'; readonly message: string };

export function HealthReportDetailsClient({ reportId }: HealthReportDetailsClientProps) {
  const router = useRouter();
  const { credentials, installationId, roleContextId } = useAuthMemory();
  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const authMissing = !credentials || !roleContextId;

  useEffect(() => {
    if (authMissing) return;
    const controller = new AbortController();
    void loadHealthReport(credentials, installationId, roleContextId, reportId, {
      signal: controller.signal,
    }).then(
      (report) => setState({ kind: 'ready', report }),
      () => {
        if (!controller.signal.aborted) {
          setState({ kind: 'error', message: 'Crop Health report is unavailable.' });
        }
      },
    );
    return () => controller.abort();
  }, [authMissing, credentials, installationId, reportId, roleContextId]);

  async function decideSharing(decision: 'ALLOW' | 'DENY', report: HealthReportResponse) {
    if (!credentials || !roleContextId) return;
    setState({ kind: 'sharing', report });
    try {
      const result = await decideHealthCaseSharing(
        credentials,
        installationId,
        roleContextId,
        report.reportId,
        {
          clientRecordedAt: new Date().toISOString(),
          commandId: globalThis.crypto.randomUUID(),
          consentAccessVersion: 1,
          decision,
          expectedRevision: report.etagRevision,
          policyVersionId: globalThis.crypto.randomUUID(),
          timezone: 'Asia/Kolkata',
        },
      );
      if (result.caseId) {
        router.push(`/farmer/cases/${result.caseId}`);
        return;
      }
      const refreshed = await loadHealthReport(credentials, installationId, roleContextId, reportId);
      setState({ kind: 'ready', report: refreshed });
    } catch {
      setState({ kind: 'error', message: 'Could not save the sharing decision.' });
    }
  }

  const displayState: ViewState = authMissing
    ? { kind: 'error', message: 'Sign in as the Farmer to view this Crop Health report.' }
    : state;
  const report =
    displayState.kind === 'ready' || displayState.kind === 'sharing'
      ? displayState.report
      : undefined;
  const triage = report?.triage;

  return (
    <main className="recommendation-screen">
      <p className="eyebrow">Crop Health result · {report?.dataMode ?? 'loading'}</p>
      <h1>{triage?.state === 'UNCLEAR' ? 'Unclear crop-health result' : 'Possible crop issue'}</h1>
      <p className="lead">
        AI output is triage only. It can say possible or unclear; it cannot confirm diagnosis or
        choose chemical treatment.
      </p>
      {displayState.kind === 'loading' ? <p aria-live="polite">Loading report…</p> : null}
      {displayState.kind === 'error' ? <p role="status">{displayState.message}</p> : null}
      {report ? (
        <>
          <section className="recommendation-panel" aria-labelledby="triage-heading">
            <h2 id="triage-heading">{triage?.summary ?? report.symptomSummary}</h2>
            <dl className="score-grid">
              <div>
                <dt>Severity</dt>
                <dd>{triage?.severity ?? 'Pending'}</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>{triage?.confidence ?? 'Pending'}</dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>{report.quality?.qualityBand ?? 'Waiting'}</dd>
              </div>
              <div>
                <dt>Sharing</dt>
                <dd>{report.sharingDecision}</dd>
              </div>
            </dl>
            <p className="evidence-note">
              Safe next step: {triage?.safeNextStep ?? 'Wait for triage or ask an RSK expert.'}
            </p>
          </section>
          <section className="recommendation-panel" aria-labelledby="categories-heading">
            <h2 id="categories-heading">Possible categories</h2>
            {triage && triage.categories.length > 0 ? (
              <ul>
                {triage.categories.map((category) => (
                  <li key={category.categoryKey}>
                    {category.label} · {category.confidence}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No possible category is shown until triage is complete.</p>
            )}
          </section>
          {report.sharingDecision === 'PENDING' ? (
            <section className="recommendation-panel" aria-labelledby="sharing-heading">
              <h2 id="sharing-heading">Expert review recommended</h2>
              <p>
                Sharing creates a purpose-limited evidence pack for RSK expert review. Declining
                creates no case and shares no evidence.
              </p>
              <div className="recommendation-actions">
                <button
                  className="primary-action"
                  disabled={displayState.kind === 'sharing'}
                  onClick={() => void decideSharing('ALLOW', report)}
                  type="button"
                >
                  Share with RSK
                </button>
                <button
                  className="secondary-action"
                  disabled={displayState.kind === 'sharing'}
                  onClick={() => void decideSharing('DENY', report)}
                  type="button"
                >
                  Decline sharing
                </button>
              </div>
            </section>
          ) : null}
          {report.caseId ? (
            <Link className="primary-link" href={`/farmer/cases/${report.caseId}`}>
              Open expert case
            </Link>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
