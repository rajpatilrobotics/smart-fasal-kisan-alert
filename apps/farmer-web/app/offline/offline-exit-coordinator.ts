'use client';

import type { FarmerOfflineStore } from '@smart-fasal/offline';

type OfflineExitStore = Pick<FarmerOfflineStore, 'prepareForUserSwitch'>;

interface ActiveStoreRegistration {
  readonly id: symbol;
  readonly store: OfflineExitStore;
}

export class OfflineExitBlockedError extends Error {
  readonly code = 'OFFLINE_EXIT_BLOCKED';

  constructor(readonly pendingItems: number) {
    super('Unsynced private work must be resolved before switching users.');
    this.name = 'OfflineExitBlockedError';
  }
}

export class FarmerOfflineExitCoordinator {
  private active: ActiveStoreRegistration | undefined;
  private pendingPreparation: Promise<void> | undefined;
  private preparedRegistrationId: symbol | undefined;

  register(store: OfflineExitStore): () => void {
    const registration: ActiveStoreRegistration = { id: Symbol('farmer-offline-store'), store };
    this.active = registration;
    this.preparedRegistrationId = undefined;
    return () => {
      if (this.active?.id === registration.id) {
        this.active = undefined;
        this.preparedRegistrationId = undefined;
      }
    };
  }

  prepareForSignOut(): Promise<void> {
    if (this.pendingPreparation !== undefined) return this.pendingPreparation;
    const preparation = this.prepareActiveStore().finally(() => {
      if (this.pendingPreparation === preparation) this.pendingPreparation = undefined;
    });
    this.pendingPreparation = preparation;
    return preparation;
  }

  private async prepareActiveStore(): Promise<void> {
    const registration = this.active;
    if (registration === undefined || this.preparedRegistrationId === registration.id) return;

    const result = await registration.store.prepareForUserSwitch({
      authorizeLockedRecovery: false,
    });
    if (result.status === 'BLOCKED_UNSYNCED') {
      throw new OfflineExitBlockedError(result.pendingItems);
    }
    // SAFE_TO_SWITCH and LOCKED_RECOVERY both leave this partition unable to accept new work.
    if (this.active?.id === registration.id) this.preparedRegistrationId = registration.id;
  }
}

const farmerOfflineExitCoordinator = new FarmerOfflineExitCoordinator();

/** Register only after the server has supplied the real subject/device binding and the store opens. */
export function registerActiveFarmerOfflineStore(store: OfflineExitStore): () => void {
  return farmerOfflineExitCoordinator.register(store);
}

export function prepareFarmerOfflineForSignOut(): Promise<void> {
  return farmerOfflineExitCoordinator.prepareForSignOut();
}
