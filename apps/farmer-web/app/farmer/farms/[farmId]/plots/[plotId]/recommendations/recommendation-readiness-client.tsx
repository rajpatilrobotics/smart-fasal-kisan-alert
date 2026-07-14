'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { RecommendationReadinessResponse } from '@smart-fasal/contracts/schemas';

import { useAuthMemory } from '../../../../../../auth/auth-memory';
import {
  createRecommendationRun,
  loadRecommendationReadiness,
} from '../../../../../../lib/farmer-api';

interface RecommendationReadinessClientProps {
  readonly farmId: string;
  readonly plotId: string;
}

type ViewState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly readiness: RecommendationReadinessResponse }
  | { readonly kind: 'running' }
  | { readonly kind: 'error'; readonly message: string };

export function RecommendationReadinessClient({
  farmId,
  plotId,
}: RecommendationReadinessClientProps) {
  const router = useRouter();
  const { credentials, installationId, roleContextId } = useAuthMemory();
  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const authMissing = !credentials || !roleContextId;

  useEffect(() => {
    if (authMissing) return;
    const controller = new AbortController();
    void loadRecommendationReadiness(credentials, installationId, roleContextId, plotId, {
      signal: controller.signal,
    }).then(
      (readiness) => setState({ kind: 'ready', readiness }),
      () => {
        if (!controller.signal.aborted) {
          setState({ kind: 'error', message: 'Recommendation readiness is unavailable.' });
        }
      },
    );
    return () => controller.abort();
  }, [authMissing, credentials, installationId, plotId, roleContextId]);

  async function runRecommendation() {
    if (!credentials || !roleContextId || state.kind !== 'ready') return;
    setState({ kind: 'running' });
    try {
      const run = await createRecommendationRun(
        credentials,
        installationId,
        roleContextId,
        plotId,
        {
          confirmedAreaRef: { areaRevision: 1, plotId },
          cultivationMethod: 'TRADITIONAL',
          farmerConstraintRefs: [],
          landAvailabilityWindow: {
            availableFrom: '2026-07-14',
            availableUntil: '2026-12-15',
          },
          planningContextRevision: state.readiness.planningContextRevision,
          planningSeasonKey: 'kharif-raigad',
          planningSeasonVersion: '2026',
          proposedStartWindow: {
            earliestDate: '2026-07-15',
            kind: 'SOWING',
            latestDate: '2026-07-25',
            timezone: 'Asia/Kolkata',
          },
          schemaVersion: 'recommendation-request-v1',
        },
      );
      router.push(`/farmer/recommendation-runs/${run.operationId}`);
    } catch {
      setState({ kind: 'error', message: 'Could not start the recommendation run.' });
    }
  }

  const readiness = state.kind === 'ready' ? state.readiness : undefined;
  const displayState: ViewState = authMissing
    ? { kind: 'error', message: 'Sign in as the Farmer to run recommendations.' }
    : state;

  return (
    <main className="recommendation-screen">
      <p className="eyebrow">Milestone 5 · Smart Crop Recommendation</p>
      <h1>Crop recommendation readiness</h1>
      <section className="recommendation-panel" aria-labelledby="ready-heading">
        <h2 id="ready-heading">Ready evidence</h2>
        {displayState.kind === 'loading' || displayState.kind === 'running' ? (
          <p aria-live="polite">
            {displayState.kind === 'running' ? 'Starting recommendation…' : 'Checking evidence…'}
          </p>
        ) : readiness ? (
          <ul className="check-list">
            {readiness.groups.ready.map((item) => (
              <li key={item.key}>
                {item.label} · {item.state}
              </li>
            ))}
          </ul>
        ) : (
          <p>{displayState.kind === 'error' ? displayState.message : 'No readiness result yet.'}</p>
        )}
      </section>
      <section className="recommendation-panel" aria-labelledby="needs-heading">
        <h2 id="needs-heading">Needs attention</h2>
        {readiness && readiness.groups.needsAttention.length > 0 ? (
          <ul>
            {readiness.groups.needsAttention.map((item) => (
              <li key={item.key}>
                {item.label}: {item.action}
              </li>
            ))}
          </ul>
        ) : (
          <p>No blocker in the Raigad demo Plot. Hardware remains optional.</p>
        )}
      </section>
      <section className="recommendation-actions" aria-label="Recommendation actions">
        <button
          className="primary-action"
          disabled={displayState.kind !== 'ready'}
          onClick={runRecommendation}
          type="button"
        >
          Run crop recommendation
        </button>
        <Link
          className="secondary-action"
          href={`/farmer/my-farm?farmId=${farmId}&plotId=${plotId}`}
        >
          Back to My Farm
        </Link>
      </section>
    </main>
  );
}
