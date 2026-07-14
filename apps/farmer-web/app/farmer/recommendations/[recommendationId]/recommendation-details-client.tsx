'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { RecommendationResultResponse } from '@smart-fasal/contracts/schemas';

import { useAuthMemory } from '../../../auth/auth-memory';
import { acceptRecommendation, loadRecommendationResult } from '../../../lib/farmer-api';

interface RecommendationDetailsClientProps {
  readonly recommendationId: string;
}

type ViewState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly result: RecommendationResultResponse }
  | { readonly kind: 'accepting'; readonly result: RecommendationResultResponse }
  | { readonly kind: 'error'; readonly message: string };

const demoCrops = [
  {
    candidateId: '11111111-1111-4111-8111-111111111101',
    confidenceScore: 82.5,
    cropName: 'Rice',
    cropProfileId: 'raigad-rice-kharif-v1',
    rank: 1,
    reasons: ['Fits the Raigad kharif window.', 'Water context supports paddy on this Plot.'],
    risks: ['If monsoon breaks, confirm water before transplanting.'],
    suitabilityScore: 86.95,
  },
  {
    candidateId: '11111111-1111-4111-8111-111111111102',
    confidenceScore: 81.7,
    cropName: 'Groundnut',
    cropProfileId: 'raigad-groundnut-kharif-v1',
    rank: 2,
    reasons: ['Moderate water demand.', 'Duration fits the land availability window.'],
    risks: ['Heavy rainfall can increase disease risk.'],
    suitabilityScore: 75.5,
  },
] as const;

export function RecommendationDetailsClient({
  recommendationId,
}: RecommendationDetailsClientProps) {
  const router = useRouter();
  const { credentials, installationId, roleContextId } = useAuthMemory();
  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const authMissing = !credentials || !roleContextId;

  useEffect(() => {
    if (authMissing) return;
    const controller = new AbortController();
    void loadRecommendationResult(credentials, installationId, roleContextId, recommendationId, {
      signal: controller.signal,
    }).then(
      (result) => setState({ kind: 'ready', result }),
      () => {
        if (!controller.signal.aborted) {
          setState({ kind: 'error', message: 'Recommendation result is unavailable.' });
        }
      },
    );
    return () => controller.abort();
  }, [authMissing, credentials, installationId, recommendationId, roleContextId]);

  async function acceptTopCrop(result: RecommendationResultResponse) {
    const top = result.candidates[0];
    if (!credentials || !roleContextId || !top) return;
    setState({ kind: 'accepting', result });
    try {
      const accepted = await acceptRecommendation(
        credentials,
        installationId,
        roleContextId,
        result.recommendationId,
        {
          candidateId: top.candidateId,
          commandId: globalThis.crypto.randomUUID(),
          expectedRevision: result.etagRevision,
          start: {
            date: '2026-07-20',
            kind: 'SOWING',
            mode: 'PROPOSED',
            timezone: 'Asia/Kolkata',
          },
        },
      );
      router.push(`/farmer/seasons/${accepted.seasonId}/calendar`);
    } catch {
      setState({ kind: 'error', message: 'Could not accept this recommendation.' });
    }
  }

  const displayState: ViewState = authMissing
    ? { kind: 'error', message: 'Sign in as the Farmer to view live recommendation data.' }
    : state;
  const result =
    displayState.kind === 'ready' || displayState.kind === 'accepting'
      ? displayState.result
      : undefined;
  const crops = result?.candidates ?? demoCrops;

  return (
    <main className="recommendation-screen">
      <p className="eyebrow">Raigad demo · {result?.dataMode ?? 'SIMULATED'}</p>
      <h1>Top crop recommendations</h1>
      <p className="lead">
        Suitability ranks the crop. Confidence only explains evidence strength. The two scores are
        never merged.
      </p>
      {displayState.kind === 'loading' ? <p aria-live="polite">Loading recommendation…</p> : null}
      {displayState.kind === 'error' ? <p role="status">{displayState.message}</p> : null}
      <div className="crop-list">
        {crops.map((crop) => (
          <article className="crop-card" key={crop.candidateId}>
            <div className="crop-card-header">
              <div>
                <p className="rank-label">Rank {crop.rank}</p>
                <h2>{crop.cropName}</h2>
              </div>
              <span className="state-chip">Confidence {crop.confidenceScore}%</span>
            </div>
            <dl className="score-grid">
              <div>
                <dt>Suitability</dt>
                <dd>{crop.suitabilityScore}%</dd>
              </div>
              <div>
                <dt>Profile</dt>
                <dd>{crop.cropProfileId}</dd>
              </div>
            </dl>
            <h3>Why this crop</h3>
            <ul>
              {crop.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <h3>Risks to watch</h3>
            <ul>
              {crop.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <section className="recommendation-panel" aria-labelledby="evidence-heading">
        <h2 id="evidence-heading">Evidence drawer</h2>
        <p>
          Snapshot pins soil, water, retained weather and Earth versions. Google display weather is
          excluded from decision evidence.
        </p>
        {result ? <p className="technical-state">Snapshot: {result.snapshotChecksum}</p> : null}
      </section>
      <section className="recommendation-actions" aria-label="Recommendation actions">
        <button className="secondary-action" type="button">
          Listen
        </button>
        <button className="secondary-action" type="button">
          Ask RSK
        </button>
        {result ? (
          <button
            className="primary-action"
            disabled={displayState.kind === 'accepting'}
            onClick={() => void acceptTopCrop(result)}
            type="button"
          >
            {displayState.kind === 'accepting'
              ? 'Accepting…'
              : `Accept ${result.candidates[0]?.cropName}`}
          </button>
        ) : (
          <Link
            className="primary-action"
            href="/farmer/seasons/22222222-2222-4222-8222-222222222222/calendar"
          >
            Demo calendar
          </Link>
        )}
      </section>
      <p className="technical-state">Recommendation ID: {recommendationId}</p>
    </main>
  );
}
