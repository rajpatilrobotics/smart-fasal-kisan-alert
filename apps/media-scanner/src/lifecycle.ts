import { unavailableProductionReadiness, type MediaScannerReadiness } from './verification.js';

export class WorkerLifecycle {
  #state: 'running' | 'stopped' = 'stopped';

  constructor(
    private readonly adapterReadiness: () => MediaScannerReadiness = unavailableProductionReadiness,
  ) {}

  get readiness(): MediaScannerReadiness {
    if (this.#state === 'stopped') {
      return {
        ready: false,
        code: 'WORKER_STOPPED',
        missing: [],
        retryable: true,
      };
    }
    return this.adapterReadiness();
  }

  get isReady(): boolean {
    return this.readiness.ready;
  }

  start(): void {
    this.#state = 'running';
  }

  stop(): void {
    this.#state = 'stopped';
  }
}
