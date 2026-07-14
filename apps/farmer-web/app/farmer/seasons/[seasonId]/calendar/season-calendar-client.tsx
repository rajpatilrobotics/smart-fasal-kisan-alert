'use client';

import { useEffect, useState } from 'react';

import type { SeasonCalendarResponse } from '@smart-fasal/contracts/schemas';

import { useAuthMemory } from '../../../../auth/auth-memory';
import { loadSeasonCalendar } from '../../../../lib/farmer-api';

interface SeasonCalendarClientProps {
  readonly seasonId: string;
}

const demoTasks = [
  {
    state: 'PLANNED',
    taskId: '22222222-2222-4222-8222-222222222201',
    title: 'Prepare field for Rice',
  },
  {
    state: 'PLANNED',
    taskId: '22222222-2222-4222-8222-222222222202',
    title: 'Check water availability before sowing',
  },
  {
    state: 'PLANNED',
    taskId: '22222222-2222-4222-8222-222222222203',
    title: 'Record first field observation',
  },
] as const;

export function SeasonCalendarClient({ seasonId }: SeasonCalendarClientProps) {
  const { credentials, installationId, roleContextId } = useAuthMemory();
  const [calendar, setCalendar] = useState<SeasonCalendarResponse | undefined>();
  const [message, setMessage] = useState('Loading season calendar…');
  const authMissing = !credentials || !roleContextId;

  useEffect(() => {
    if (authMissing) return;
    const controller = new AbortController();
    void loadSeasonCalendar(credentials, installationId, roleContextId, seasonId, {
      signal: controller.signal,
    }).then(
      (result) => {
        setCalendar(result);
        setMessage('');
      },
      () => {
        if (!controller.signal.aborted) setMessage('Season calendar is unavailable.');
      },
    );
    return () => controller.abort();
  }, [authMissing, credentials, installationId, roleContextId, seasonId]);

  const tasks = calendar?.tasks ?? demoTasks;
  const displayMessage = authMissing
    ? 'Sign in as the Farmer to view live calendar tasks.'
    : message;

  return (
    <main className="recommendation-screen">
      <p className="eyebrow">Accepted recommendation</p>
      <h1>Season calendar</h1>
      <p className="lead">
        Proposed acceptance creates a planned Season and Calendar. Stage-relative tasks activate
        only after actual start confirmation.
      </p>
      {displayMessage ? <p role="status">{displayMessage}</p> : null}
      <ol className="task-list">
        {tasks.map((task) => (
          <li key={task.taskId}>
            <strong>{task.title}</strong>
            <span>{task.state} · from Recommendation acceptance</span>
          </li>
        ))}
      </ol>
      <p className="technical-state">Season ID: {seasonId}</p>
    </main>
  );
}
