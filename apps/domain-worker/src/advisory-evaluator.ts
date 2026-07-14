export interface AdvisoryEvaluationOwner {
  readonly authorizationVersion: number;
  readonly environment: string;
  readonly subjectId: string;
}

export interface AdvisoryEvaluationService {
  evaluatePlot(
    owner: AdvisoryEvaluationOwner,
    plotId: string,
  ): Promise<{
    readonly advisoryId: string;
    readonly dataMode: 'LIVE' | 'RECORDED' | 'SIMULATED';
    readonly kind: string;
    readonly lifecycleState: string;
  }>;
}

export interface AdvisoryEvaluationJob {
  readonly jobId: string;
  readonly owner: AdvisoryEvaluationOwner;
  readonly plotId: string;
  readonly reason:
    | 'SCHEDULED'
    | 'EVIDENCE_CHANGED'
    | 'SENSOR_STALE'
    | 'DEMO_SCENARIO'
    | 'MANUAL_RECHECK';
}

export type AdvisoryEvaluationResult =
  | {
      readonly state: 'GENERATED' | 'DEDUPLICATED';
      readonly advisoryId: string;
      readonly kind: string;
      readonly dataMode: 'LIVE' | 'RECORDED' | 'SIMULATED';
    }
  | { readonly state: 'UNAVAILABLE'; readonly safeProblemCode: string };

export interface SafeAdvisoryEvaluationEvent {
  readonly eventName: 'domain_worker.advisory_evaluated';
  readonly jobId: string;
  readonly reason: AdvisoryEvaluationJob['reason'];
  readonly state: AdvisoryEvaluationResult['state'];
  readonly advisoryId?: string;
  readonly safeProblemCode?: string;
}

export class AdvisoryEvaluationWorker {
  constructor(
    private readonly service: AdvisoryEvaluationService,
    private readonly emitSafeEvent: (event: SafeAdvisoryEvaluationEvent) => void = () => undefined,
  ) {}

  async runOnce(job: AdvisoryEvaluationJob): Promise<AdvisoryEvaluationResult> {
    try {
      const advisory = await this.service.evaluatePlot(job.owner, job.plotId);
      const result: AdvisoryEvaluationResult = {
        state: advisory.lifecycleState === 'DEDUPLICATED' ? 'DEDUPLICATED' : 'GENERATED',
        advisoryId: advisory.advisoryId,
        kind: advisory.kind,
        dataMode: advisory.dataMode,
      };
      this.emitSafeEvent({
        eventName: 'domain_worker.advisory_evaluated',
        jobId: job.jobId,
        reason: job.reason,
        state: result.state,
        advisoryId: result.advisoryId,
      });
      return result;
    } catch {
      const result = { state: 'UNAVAILABLE', safeProblemCode: 'ADVISORY_EVALUATION_FAILED' } as const;
      this.emitSafeEvent({
        eventName: 'domain_worker.advisory_evaluated',
        jobId: job.jobId,
        reason: job.reason,
        state: result.state,
        safeProblemCode: result.safeProblemCode,
      });
      return result;
    }
  }
}
