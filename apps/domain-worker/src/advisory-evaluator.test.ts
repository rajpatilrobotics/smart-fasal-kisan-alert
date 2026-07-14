import { describe, expect, it, vi } from 'vitest';

import { AdvisoryEvaluationWorker, type SafeAdvisoryEvaluationEvent } from './advisory-evaluator.js';

const job = {
  jobId: '00000000-0000-4000-8000-000000000901',
  owner: {
    authorizationVersion: 1,
    environment: 'local',
    subjectId: '00000000-0000-4000-8000-000000000101',
  },
  plotId: '00000000-0000-4000-8000-000000000401',
  reason: 'EVIDENCE_CHANGED',
} as const;

describe('AdvisoryEvaluationWorker', () => {
  it('evaluates a plot through the shared advisory service and emits only safe metadata', async () => {
    const safeEvents: SafeAdvisoryEvaluationEvent[] = [];
    const evaluatePlot = vi.fn().mockResolvedValue({
      advisoryId: '00000000-0000-4000-8000-000000000501',
      dataMode: 'RECORDED',
      kind: 'IRRIGATION_NEEDED',
      lifecycleState: 'ACTIVE',
      summary: 'private farmer-facing reason not for worker logs',
    });
    const worker = new AdvisoryEvaluationWorker({ evaluatePlot }, (event) => safeEvents.push(event));

    await expect(worker.runOnce(job)).resolves.toEqual({
      advisoryId: '00000000-0000-4000-8000-000000000501',
      dataMode: 'RECORDED',
      kind: 'IRRIGATION_NEEDED',
      state: 'GENERATED',
    });
    expect(evaluatePlot).toHaveBeenCalledWith(job.owner, job.plotId);
    expect(JSON.stringify(safeEvents)).not.toContain('private farmer-facing reason');
    expect(safeEvents).toEqual([
      {
        advisoryId: '00000000-0000-4000-8000-000000000501',
        eventName: 'domain_worker.advisory_evaluated',
        jobId: job.jobId,
        reason: 'EVIDENCE_CHANGED',
        state: 'GENERATED',
      },
    ]);
  });

  it('reports unavailable without leaking raw errors', async () => {
    const safeEvents: SafeAdvisoryEvaluationEvent[] = [];
    const worker = new AdvisoryEvaluationWorker(
      { evaluatePlot: vi.fn().mockRejectedValue(new Error('secret raw provider error')) },
      (event) => safeEvents.push(event),
    );

    await expect(worker.runOnce(job)).resolves.toEqual({
      safeProblemCode: 'ADVISORY_EVALUATION_FAILED',
      state: 'UNAVAILABLE',
    });
    expect(JSON.stringify(safeEvents)).not.toContain('secret raw provider error');
    expect(safeEvents.at(-1)).toMatchObject({
      safeProblemCode: 'ADVISORY_EVALUATION_FAILED',
      state: 'UNAVAILABLE',
    });
  });
});
