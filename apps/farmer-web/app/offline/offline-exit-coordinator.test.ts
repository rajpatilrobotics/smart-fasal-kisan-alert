import { describe, expect, it, vi } from 'vitest';

import { FarmerOfflineExitCoordinator, OfflineExitBlockedError } from './offline-exit-coordinator';

describe('Farmer offline exit coordinator', () => {
  it('allows sign-out before any identity-bound partition has been registered', async () => {
    const coordinator = new FarmerOfflineExitCoordinator();
    await expect(coordinator.prepareForSignOut()).resolves.toBeUndefined();
  });

  it.each(['SAFE_TO_SWITCH', 'LOCKED_RECOVERY'] as const)(
    'allows sign-out after the active store returns %s',
    async (status) => {
      const coordinator = new FarmerOfflineExitCoordinator();
      const prepareForUserSwitch = vi.fn().mockResolvedValue({ status });
      coordinator.register({ prepareForUserSwitch });

      await expect(coordinator.prepareForSignOut()).resolves.toBeUndefined();
      await expect(coordinator.prepareForSignOut()).resolves.toBeUndefined();
      expect(prepareForUserSwitch).toHaveBeenCalledWith({ authorizeLockedRecovery: false });
      expect(prepareForUserSwitch).toHaveBeenCalledOnce();
    },
  );

  it('blocks shared-device exit when unsynced private work cannot yet be locked', async () => {
    const coordinator = new FarmerOfflineExitCoordinator();
    const prepareForUserSwitch = vi.fn().mockResolvedValue({
      pendingItems: 3,
      status: 'BLOCKED_UNSYNCED',
    });
    coordinator.register({ prepareForUserSwitch });

    await expect(coordinator.prepareForSignOut()).rejects.toMatchObject({
      code: 'OFFLINE_EXIT_BLOCKED',
      pendingItems: 3,
    } satisfies Partial<OfflineExitBlockedError>);
  });

  it('does not let a stale cleanup unregister the newer active partition', async () => {
    const coordinator = new FarmerOfflineExitCoordinator();
    const stale = vi.fn().mockResolvedValue({ status: 'SAFE_TO_SWITCH' });
    const current = vi.fn().mockResolvedValue({ status: 'SAFE_TO_SWITCH' });
    const unregisterStale = coordinator.register({ prepareForUserSwitch: stale });
    coordinator.register({ prepareForUserSwitch: current });

    unregisterStale();
    await coordinator.prepareForSignOut();

    expect(stale).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledOnce();
  });

  it('coalesces simultaneous sign-out preparation for one active store', async () => {
    const coordinator = new FarmerOfflineExitCoordinator();
    const prepareForUserSwitch = vi.fn().mockResolvedValue({ status: 'SAFE_TO_SWITCH' });
    coordinator.register({ prepareForUserSwitch });

    await Promise.all([coordinator.prepareForSignOut(), coordinator.prepareForSignOut()]);

    expect(prepareForUserSwitch).toHaveBeenCalledOnce();
  });

  it('requires the replacement active partition to prepare independently', async () => {
    const coordinator = new FarmerOfflineExitCoordinator();
    const first = vi.fn().mockResolvedValue({ status: 'SAFE_TO_SWITCH' });
    const second = vi.fn().mockResolvedValue({ status: 'SAFE_TO_SWITCH' });
    coordinator.register({ prepareForUserSwitch: first });
    await coordinator.prepareForSignOut();

    coordinator.register({ prepareForUserSwitch: second });
    await coordinator.prepareForSignOut();

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });
});
