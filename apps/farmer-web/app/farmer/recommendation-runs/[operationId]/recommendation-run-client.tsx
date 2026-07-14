'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuthMemory } from '../../../auth/auth-memory';
import { loadRecommendationRun } from '../../../lib/farmer-api';

interface RecommendationRunClientProps {
  readonly operationId: string;
}

export function RecommendationRunClient({ operationId }: RecommendationRunClientProps) {
  const router = useRouter();
  const { credentials, installationId, roleContextId } = useAuthMemory();
  const [message, setMessage] = useState('Checking recommendation status…');
  const authMissing = !credentials || !roleContextId;

  useEffect(() => {
    if (authMissing) return;
    const controller = new AbortController();
    let timeout: number | undefined;
    const poll = async () => {
      try {
        const run = await loadRecommendationRun(
          credentials,
          installationId,
          roleContextId,
          operationId,
          { signal: controller.signal },
        );
        if (run.state === 'SUCCEEDED' && run.recommendationId) {
          router.replace(`/farmer/recommendations/${run.recommendationId}`);
          return;
        }
        if (
          run.state.startsWith('FAILED') ||
          run.state === 'CANCELLED' ||
          run.state === 'EXPIRED'
        ) {
          setMessage(run.problemCode ?? `Recommendation run ended with ${run.state}.`);
          return;
        }
        setMessage(`Recommendation status: ${run.state}`);
        timeout = window.setTimeout(poll, 1_500);
      } catch {
        if (!controller.signal.aborted) {
          setMessage('Recommendation status is unavailable.');
        }
      }
    };
    void poll();
    return () => {
      controller.abort();
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [authMissing, credentials, installationId, operationId, roleContextId, router]);

  const displayMessage = authMissing
    ? 'Sign in as the Farmer to view this recommendation run.'
    : message;

  return (
    <main className="recommendation-screen">
      <p className="eyebrow">Recommendation run</p>
      <h1>Recommendation is being prepared</h1>
      <section className="recommendation-panel" aria-live="polite">
        <p>{displayMessage}</p>
        <p className="technical-state">Operation ID: {operationId}</p>
      </section>
      <Link className="secondary-action" href="/farmer/today">
        Back to Today
      </Link>
    </main>
  );
}
