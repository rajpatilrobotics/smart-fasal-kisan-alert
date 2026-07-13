export class WorkerLifecycle {
  #state: 'running' | 'stopped' = 'stopped';

  get isReady(): boolean {
    return this.#state === 'running';
  }

  start(): void {
    this.#state = 'running';
  }

  stop(): void {
    this.#state = 'stopped';
  }
}
