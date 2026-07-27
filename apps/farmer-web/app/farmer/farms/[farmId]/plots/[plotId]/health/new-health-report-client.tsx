'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { HealthReportResponse } from '@smart-fasal/contracts/schemas';

import { useAuthMemory } from '../../../../../../auth/auth-memory';
import {
  attachHealthMedia,
  saveHealthReportDraft,
  submitHealthReport,
} from '../../../../../../lib/farmer-api';

interface NewHealthReportClientProps {
  readonly farmId: string;
  readonly plotId: string;
}

type CaptureState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'ready'; readonly report: HealthReportResponse }
  | { readonly kind: 'error'; readonly message: string };

export function NewHealthReportClient({ farmId, plotId }: NewHealthReportClientProps) {
  const router = useRouter();
  const { credentials, installationId, roleContextId } = useAuthMemory();
  const [state, setState] = useState<CaptureState>({ kind: 'idle' });
  const authMissing = !credentials || !roleContextId;

  async function createRecordedDemoReport() {
    if (!credentials || !roleContextId) {
      setState({ kind: 'error', message: 'Sign in as the Farmer before saving a report.' });
      return;
    }
    setState({ kind: 'saving' });
    try {
      const recordedAt = new Date().toISOString();
      const draft = await saveHealthReportDraft(credentials, installationId, roleContextId, plotId, {
        answers: [
          {
            answer: 'leaf',
            language: 'en',
            questionKey: 'affectedPart',
            source: 'GUIDED_CHOICE',
            unknown: false,
          },
          {
            answer: 'spreading',
            language: 'en',
            questionKey: 'spread',
            source: 'GUIDED_CHOICE',
            unknown: false,
          },
          {
            answer: 'after recent rain',
            language: 'en',
            questionKey: 'recentWeather',
            source: 'GUIDED_CHOICE',
            unknown: false,
          },
        ],
        clientRecordedAt: recordedAt,
        commandId: globalThis.crypto.randomUUID(),
        cropName: 'Rice',
        expectedRevision: 0,
        language: 'mr',
        schemaVersion: 'health-report-draft-v1',
        symptomSummary: 'Brown spots are visible on rice leaves and appear to be spreading.',
        timezone: 'Asia/Kolkata',
      });
      const attached = await attachHealthMedia(
        credentials,
        installationId,
        roleContextId,
        draft.reportId,
        {
          assetId: globalThis.crypto.randomUUID(),
          clientRecordedAt: recordedAt,
          commandId: globalThis.crypto.randomUUID(),
          consentAccessVersion: 1,
          expectedRevision: draft.etagRevision,
          requiredView: 'WHOLE_PLANT',
          timezone: 'Asia/Kolkata',
        },
      );
      const submitted = await submitHealthReport(
        credentials,
        installationId,
        roleContextId,
        draft.reportId,
        {
          clientSubmittedAt: new Date().toISOString(),
          commandId: globalThis.crypto.randomUUID(),
          expectedRevision: attached.etagRevision,
          timezone: 'Asia/Kolkata',
        },
      );
      setState({ kind: 'ready', report: submitted });
      router.push(`/farmer/health/${submitted.reportId}`);
    } catch {
      setState({
        kind: 'error',
        message:
          'Could not save the Crop Health report. If media verification is unavailable, try again with the recorded demo adapter.',
      });
    }
  }

  const disabled = authMissing || state.kind === 'saving';

  return (
    <main className="recommendation-screen">
      <p className="eyebrow">Guided capture · Recorded demo media</p>
      <h1>Report a crop problem</h1>
      <p className="lead">
        This flow records the farmer account separately from AI triage. The demo uses a labelled
        recorded rice-leaf image reference; it does not claim a live camera upload.
      </p>
      <section className="recommendation-panel" aria-labelledby="capture-heading">
        <h2 id="capture-heading">What will be saved</h2>
        <ul className="check-list">
          <li>
            <span>1</span>
            <div>Crop: Rice on the selected Plot.</div>
          </li>
          <li>
            <span>2</span>
            <div>Symptoms: brown leaf spots, spreading after recent rain.</div>
          </li>
          <li>
            <span>3</span>
            <div>Media mode: RECORDED demo reference, quality checked before triage.</div>
          </li>
        </ul>
      </section>
      {state.kind === 'error' ? <p role="status">{state.message}</p> : null}
      {state.kind === 'ready' ? (
        <p role="status">Saved report {state.report.reportId}. Opening details…</p>
      ) : null}
      <section className="recommendation-actions" aria-label="Report actions">
        <button
          className="primary-action"
          disabled={disabled}
          onClick={() => void createRecordedDemoReport()}
          type="button"
        >
          {state.kind === 'saving' ? 'Saving report…' : 'Save and triage demo report'}
        </button>
        <Link className="secondary-action" href={`/farmer/farms/${farmId}/plots/${plotId}/health`}>
          Back to Crop Health
        </Link>
      </section>
    </main>
  );
}
